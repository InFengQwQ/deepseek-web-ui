/* ================================================================
   render.js — DOM rendering and message display
   Depends on: dom.js, utils.js, state.js, api.js (for actions)
   ================================================================ */

/* ---- Scroll helpers ---- */

function preserveScrollPosition(container, fn) {
  var isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
  var previousScrollTop = container.scrollTop;
  fn();
  if (isAtBottom) {
    container.scrollTop = container.scrollHeight;
  } else {
    container.scrollTop = previousScrollTop;
  }
}

function evaluateScrollToBottom() {
  var c = DomRefs.chatContainer;
  var b = DomRefs.scrollToBottomBtn;
  if (!c || !b) return;
  var distanceFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
  if (distanceFromBottom > 100) {
    b.classList.remove('hidden');
  } else {
    b.classList.add('hidden');
  }
}

/* ---- Action icon button factory ---- */

function mkActionIconBtn(title, iconSvg, handler, disableDuringGen) {
  var btn = document.createElement('button');
  btn.className = 'action-icon-btn';
  btn.title = title;
  btn.innerHTML = iconSvg;
  if (disableDuringGen && getIsGenerating()) btn.disabled = true;
  btn.onclick = handler;
  return btn;
}

/* ---- Sub-renderers ---- */

function renderEmptyState() {
  DomRefs.chatContainer.innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-state-title">开始新对话</div>' +
      '<div class="empty-input-row">' +
        '<div class="empty-input-spacer" aria-hidden="true"></div>' +
        '<div class="empty-input-wrapper">' +
          '<div class="empty-input-shell">' +
            '<textarea id="emptyInput" placeholder="输入用户消息…" rows="1" autofocus></textarea>' +
          '</div>' +
        '</div>' +
        '<button id="emptySendBtn" class="primary">发送</button>' +
      '</div>' +
    '</div>';

  document.getElementById('emptySendBtn').onclick = function () {
    var input = document.getElementById('emptyInput');
    var content = input.value;
    setMessages(getMessages().concat([createMessage('user', content)]));
    renderMessages();
    persistMessages();
  };

  var emptyInput = document.getElementById('emptyInput');
  autoResizeTextarea(emptyInput, { minHeight: 36, maxHeight: 168, clampOverflow: true });
}

function renderMessageMeta(msg) {
  var metaDiv = document.createElement('div');
  metaDiv.className = 'msg-meta';

  var roleSpan = document.createElement('span');
  roleSpan.className = 'msg-role ' + msg.role;
  roleSpan.innerText = msg.role === 'user' ? '用户' : 'DeepSeek';

  var timeSpan = document.createElement('span');
  timeSpan.className = 'msg-time';
  timeSpan.innerText = formatMessageTime(msg.createdAt);

  metaDiv.appendChild(roleSpan);
  metaDiv.appendChild(timeSpan);

  if (msg.role === 'assistant') {
    metaDiv.appendChild(renderVersionNav(msg));
  }

  return metaDiv;
}

function renderVersionNav(msg) {
  var versionNav = document.createElement('div');
  versionNav.className = 'version-nav';

  var prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'version-nav-btn';
  prevBtn.innerHTML = '&lsaquo;';

  var versionLabel = document.createElement('span');
  versionLabel.className = 'version-nav-label';

  var nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'version-nav-btn';
  nextBtn.innerHTML = '&rsaquo;';

  var versionCount = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions.length : 1;
  var currentVersionIndex = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : versionCount - 1;

  versionLabel.innerText = (Math.min(currentVersionIndex + 1, versionCount)) + '/' + versionCount;
  prevBtn.disabled = currentVersionIndex <= 0;
  nextBtn.disabled = currentVersionIndex >= versionCount - 1;

  prevBtn.onclick = function () { setAssistantVersion(msg, currentVersionIndex - 1); };
  nextBtn.onclick = function () { setAssistantVersion(msg, currentVersionIndex + 1); };

  versionNav.appendChild(prevBtn);
  versionNav.appendChild(versionLabel);
  versionNav.appendChild(nextBtn);

  return versionNav;
}

function renderReasoningBlock(msg) {
  var reasoningDiv = document.createElement('div');
  reasoningDiv.className = 'reasoning-block';

  var hdr = createReasoningHeader(false);
  var contentReason = document.createElement('div');
  contentReason.className = 'reasoning-text';
  contentReason.innerHTML = renderMarkdownToHTML(msg.reasoning_content);

  var collapsed = false;
  hdr.header.onclick = function () {
    collapsed = !collapsed;
    setHidden(contentReason, collapsed);
    hdr.state.innerText = collapsed ? '(已折叠)' : '(点击折叠)';
  };

  reasoningDiv.appendChild(hdr.header);
  reasoningDiv.appendChild(contentReason);

  return reasoningDiv;
}

function renderMessageActions(msg, contentDiv) {
  var actionsDiv = document.createElement('div');
  actionsDiv.className = 'msg-actions';

  actionsDiv.appendChild(mkActionIconBtn('插入', ICONS.insert, function () { insertUserMessageAfter(msg.id); }, false));
  actionsDiv.appendChild(mkActionIconBtn('编辑', ICONS.edit, function () { editMessage(msg.id, contentDiv, actionsDiv); }, false));
  actionsDiv.appendChild(mkActionIconBtn('删除', ICONS.delete, function () { deleteMessage(msg.id); }, false));

  var sep1 = document.createElement('span');
  sep1.className = 'action-sep';
  actionsDiv.appendChild(sep1);

  actionsDiv.appendChild(mkActionIconBtn('生成响应', ICONS.generate, function () { generateNewResponse(msg.id); }, true));

  if (msg.role === 'assistant') {
    var sep2 = document.createElement('span');
    sep2.className = 'action-sep';
    actionsDiv.appendChild(sep2);
    actionsDiv.appendChild(mkActionIconBtn('前缀续写', ICONS.prefix, function () { prefixCompletion(msg.id); }, true));
    actionsDiv.appendChild(mkActionIconBtn('重新生成', ICONS.regenerate, function () { regenerateAssistant(msg.id); }, true));
  }

  return actionsDiv;
}

function renderMessageItem(msg) {
  var msgDiv = document.createElement('div');
  msgDiv.className = 'message-item ' + (msg.role === 'user' ? 'user-msg' : 'assistant-msg');
  msgDiv.dataset.id = msg.id;

  var metaDiv = renderMessageMeta(msg);
  msgDiv.appendChild(metaDiv);

  if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
    msgDiv.appendChild(renderReasoningBlock(msg));
  }

  var contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';

  var shouldShowTyping =
    msg.id === getActiveGeneratingMessageId() &&
    !(msg.content && msg.content.length > 0) &&
    !(msg.reasoning_content && msg.reasoning_content.length > 0);

  if (shouldShowTyping) {
    contentDiv.innerHTML = '<span class="typing-indicator"></span>';
  } else {
    contentDiv.innerHTML = renderMarkdownToHTML(msg.content);
  }

  msgDiv.appendChild(contentDiv);

  var actionsDiv = renderMessageActions(msg, contentDiv);
  setHidden(actionsDiv, msg.id === getActiveGeneratingMessageId());
  msgDiv.appendChild(actionsDiv);

  return { msgDiv: msgDiv, contentDiv: contentDiv, actionsDiv: actionsDiv };
}

/* ---- Main render entry point ---- */

function renderMessages() {
  if (!DomRefs.chatContainer) return;

  if (getMessages().length === 0) {
    renderEmptyState();
    return;
  }

  preserveScrollPosition(DomRefs.chatContainer, function () {
    DomRefs.chatContainer.innerHTML = '';
    getMessages().forEach(function (msg) {
      var parts = renderMessageItem(msg);
      DomRefs.chatContainer.appendChild(parts.msgDiv);
      if (msg._isNew) {
        delete msg._isNew;
        editMessage(msg.id, parts.contentDiv, parts.actionsDiv, true);
      }
    });
  });

  evaluateScrollToBottom();
}

/* ---- Incremental update (called during streaming) ---- */

function updateSingleMessageDOM(msgId) {
  var msg = findMessageById(msgId);
  if (!msg || !DomRefs.chatContainer) return;

  var msgDiv = DomRefs.chatContainer.querySelector('.message-item[data-id="' + msgId + '"]');
  if (!msgDiv) {
    renderMessages();
    return;
  }

  var c = DomRefs.chatContainer;
  var isAtBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 50;
  var previousScrollTop = c.scrollTop;

  if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
    var reasoningDiv = msgDiv.querySelector('.reasoning-block');
    if (!reasoningDiv) {
      reasoningDiv = document.createElement('div');
      reasoningDiv.className = 'reasoning-block';

      var hdr = createReasoningHeader(false);
      var contentReason = document.createElement('div');
      contentReason.className = 'reasoning-text';

      var collapsed = false;
      hdr.header.onclick = function () {
        collapsed = !collapsed;
        setHidden(contentReason, collapsed);
        hdr.state.innerText = collapsed ? '(已折叠)' : '(点击折叠)';
      };

      reasoningDiv.appendChild(hdr.header);
      reasoningDiv.appendChild(contentReason);

      var contentDiv = msgDiv.querySelector('.msg-content');
      msgDiv.insertBefore(reasoningDiv, contentDiv);
    }
    var textDiv = reasoningDiv.querySelector('.reasoning-text');
    if (textDiv) textDiv.innerHTML = renderMarkdownToHTML(msg.reasoning_content);
  }

  var contentDiv = msgDiv.querySelector('.msg-content');
  if (contentDiv && !contentDiv.querySelector('textarea')) {
    var shouldShowTyping =
      msg.id === getActiveGeneratingMessageId() &&
      !(msg.content && msg.content.length > 0) &&
      !(msg.reasoning_content && msg.reasoning_content.length > 0);
    if (shouldShowTyping) {
      contentDiv.innerHTML = '<span class="typing-indicator"></span>';
    } else {
      contentDiv.innerHTML = renderMarkdownToHTML(msg.content);
    }
  }

  var actionsDiv = msgDiv.querySelector('.msg-actions');
  if (actionsDiv) {
    setHidden(actionsDiv, msg.id === getActiveGeneratingMessageId());
  }

  if (isAtBottom) {
    c.scrollTop = c.scrollHeight;
  } else {
    c.scrollTop = previousScrollTop;
  }
  evaluateScrollToBottom();
}

/* ---- Message CRUD (trigger re-renders) ---- */

function insertUserMessageAfter(afterMsgId) {
  var idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var newMsg = createMessage('user', '', { isNew: true });
  var newMessages = getMessages().slice();
  newMessages.splice(idx + 1, 0, newMsg);
  setMessages(newMessages);
  renderMessages();
  persistMessages();
}

function editMessage(msgId, contentDiv, actionsDiv, isNew) {
  var msg = findMessageById(msgId);
  if (!msg) return;
  if (contentDiv.querySelector('textarea')) return;

  var textarea = document.createElement('textarea');
  textarea.className = 'compact-textarea message-edit-textarea';
  textarea.value = msg.content;

  var saveBtn = document.createElement('button');
  saveBtn.className = 'small primary message-edit-save';
  saveBtn.innerText = '保存';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'small';
  cancelBtn.innerText = '取消';

  var editActions = document.createElement('div');
  editActions.className = 'message-edit-actions';
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);
  contentDiv.appendChild(editActions);

  autoResizeTextarea(textarea);

  if (actionsDiv) actionsDiv.style.opacity = '0';
  textarea.focus();

  saveBtn.onclick = function () {
    var newContent = textarea.value;
    if (msg.role === 'assistant') {
      var version = ensureAssistantVersion(msg);
      if (version) {
        version.content = newContent;
        version.reasoning_content = msg.reasoning_content || null;
        syncAssistantMessageToCurrentVersion(msg);
      }
    } else {
      msg.content = newContent;
    }
    persistMessages();
    setStatus(isNew ? '消息已插入' : '消息已修改', 1500);
    renderMessages();
  };

  cancelBtn.onclick = function () {
    if (isNew) {
      deleteMessage(msg.id);
    } else {
      renderMessages();
    }
  };
}

function deleteMessage(msgId) {
  var idx = findMessageIndexById(msgId);
  if (idx !== -1) {
    setMessages(getMessages().slice(0, idx).concat(getMessages().slice(idx + 1)));
    renderMessages();
    persistMessages();
    setStatus('消息已删除');
  }
}
