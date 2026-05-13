/* ================================================================
   render.js — DOM rendering and message display
   ================================================================ */

(function() {

/* ---- Action icon button factory ---- */

function createActionIconBtn(title, iconSvg, handler, disableDuringGen) {
  var btn = document.createElement('button');
  btn.className = 'action-icon-btn';
  btn.title = title;
  btn.innerHTML = iconSvg;
  if (disableDuringGen && state.isGenerating) btn.disabled = true;
  btn.onclick = handler;
  return btn;
}

/** Build inline-edit UI (textarea + save/cancel) inside a message content div. */
function createEditModeUI(msg, contentDiv, actionsDiv) {
  var textarea = document.createElement('textarea');
  textarea.className = 'compact-textarea message-edit-textarea';
  textarea.value = msg.content;

  var saveBtn = document.createElement('button');
  saveBtn.className = 'small primary message-edit-save';
  saveBtn.innerText = UI.BTN_SAVE;

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'small';
  cancelBtn.innerText = UI.BTN_CANCEL;

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

  return { textarea: textarea, saveBtn: saveBtn, cancelBtn: cancelBtn };
}

/* ---- Sub-renderers ---- */

function renderMessageMeta(msg) {
  var metaDiv = document.createElement('div');
  metaDiv.className = 'msg-meta';

  var roleSpan = document.createElement('span');
  roleSpan.className = 'msg-role ' + msg.role;
  roleSpan.innerText = msg.role === 'user' ? UI.ROLE_USER : UI.ROLE_ASSISTANT;

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

  var info = getVersionInfo(msg);

  versionLabel.innerText = (Math.min(info.current + 1, info.count)) + '/' + info.count;
  prevBtn.disabled = info.current <= 0;
  nextBtn.disabled = info.current >= info.count - 1;

  prevBtn.onclick = function () { setAssistantVersion(msg, info.current - 1); };
  nextBtn.onclick = function () { setAssistantVersion(msg, info.current + 1); };

  versionNav.appendChild(prevBtn);
  versionNav.appendChild(versionLabel);
  versionNav.appendChild(nextBtn);

  return versionNav;
}

function renderMessageActions(msg, contentDiv) {
  var actionsDiv = document.createElement('div');
  actionsDiv.className = 'msg-actions';

  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_INSERT, ICONS.insert, function () { insertUserMessageAfter(msg.id); }, false));
  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_EDIT, ICONS.edit, function () { editMessage(msg.id, contentDiv, actionsDiv); }, false));
  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_DELETE, ICONS.delete, function () { deleteMessage(msg.id); }, false));

  var sep1 = document.createElement('span');
  sep1.className = 'action-sep';
  actionsDiv.appendChild(sep1);

  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_GENERATE, ICONS.generate, function () { generateNewResponse(msg.id); }, true));

  if (msg.role === 'assistant') {
    var sep2 = document.createElement('span');
    sep2.className = 'action-sep';
    actionsDiv.appendChild(sep2);
    actionsDiv.appendChild(createActionIconBtn(UI.ACTION_PREFIX, ICONS.prefix, function () { prefixCompletion(msg.id); }, true));
    actionsDiv.appendChild(createActionIconBtn(UI.ACTION_REGENERATE, ICONS.regenerate, function () { regenerateAssistant(msg.id); }, true));
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
    msgDiv.appendChild(createReasoningBlockDOM(msg.reasoning_content));
  }

  var contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content prose-content';

  var shouldShowTyping =
    msg.id === state.activeGeneratingMessageId &&
    !(msg.content && msg.content.length > 0) &&
    !(msg.reasoning_content && msg.reasoning_content.length > 0);

  if (shouldShowTyping) {
    contentDiv.innerHTML = '<span class="typing-indicator"></span>';
  } else {
    contentDiv.innerHTML = renderMarkdownToHTML(msg.content);
  }

  msgDiv.appendChild(contentDiv);

  var actionsDiv = renderMessageActions(msg, contentDiv);
  setHidden(actionsDiv, msg.id === state.activeGeneratingMessageId);
  msgDiv.appendChild(actionsDiv);

  return { msgDiv: msgDiv, contentDiv: contentDiv, actionsDiv: actionsDiv };
}

/* ---- Main render entry point ---- */

function renderMessages() {
  if (!DomRefs.chatContainer) return;

  if (state.messages.length === 0) {
    renderEmptyState();
    return;
  }

  preserveScrollPosition(DomRefs.chatContainer, function () {
    DomRefs.chatContainer.innerHTML = '';
    state.messages.forEach(function (msg) {
      var parts = renderMessageItem(msg);
      DomRefs.chatContainer.appendChild(parts.msgDiv);
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
    refreshMessageDOM(msgId);
    return;
  }

  preserveScrollPosition(DomRefs.chatContainer, function () {
    if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
      var reasoningDiv = msgDiv.querySelector('.reasoning-block');
      if (!reasoningDiv) {
        reasoningDiv = createReasoningBlockDOM(msg.reasoning_content);
        var existingContent = msgDiv.querySelector('.msg-content');
        msgDiv.insertBefore(reasoningDiv, existingContent);
      } else {
        var textDiv = reasoningDiv.querySelector('.reasoning-text');
        if (textDiv) textDiv.innerHTML = renderMarkdownToHTML(msg.reasoning_content);
      }
    }

    var contentDiv = msgDiv.querySelector('.msg-content');
    if (contentDiv && !contentDiv.querySelector('textarea')) {
      var shouldShowTyping =
        msg.id === state.activeGeneratingMessageId &&
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
      setHidden(actionsDiv, msg.id === state.activeGeneratingMessageId);
    }
  });

  evaluateScrollToBottom();
}

/** Replace a single message's DOM element with a fresh render from state. */
function refreshMessageDOM(msgId) {
  var msg = findMessageById(msgId);
  if (!msg) return;
  var oldDiv = DomRefs.chatContainer.querySelector('.message-item[data-id="' + msgId + '"]');
  if (!oldDiv) {
    if (state.messages.length === 0) renderEmptyState();
    else renderMessages();
    return;
  }
  var parts = renderMessageItem(msg);
  oldDiv.parentNode.replaceChild(parts.msgDiv, oldDiv);
  evaluateScrollToBottom();
}

/* ---- Version navigation ---- */

/** Switch assistant message version index, persist, and re-render. */
function setAssistantVersion(msg, versionIndex) {
  if (!msg || msg.role !== 'assistant') return;
  msg.currentVersionIndex = versionIndex;
  applyCurrentVersion(msg);
  persistMessages();
  refreshMessageDOM(msg.id);
}

window.createActionIconBtn = createActionIconBtn;
window.createEditModeUI = createEditModeUI;
window.renderMessageMeta = renderMessageMeta;
window.renderVersionNav = renderVersionNav;
window.renderMessageActions = renderMessageActions;
window.renderMessageItem = renderMessageItem;
window.renderMessages = renderMessages;
window.updateSingleMessageDOM = updateSingleMessageDOM;
window.refreshMessageDOM = refreshMessageDOM;
window.setAssistantVersion = setAssistantVersion;

})();


