/* ================================================================
   render.js — Message rendering: item DOM, reasoning block, version
   nav, meta, actions, top-level rendering, incremental updates,
   edit-mode UI
   ================================================================ */

(function() {

/* === Item-level rendering === */

/* ---- Reasoning block DOM rendering ---- */

function createReasoningHeader(initialCollapsed) {
  var header = document.createElement('div');
  header.className = 'reasoning-header';
  var title = document.createElement('span');
  title.innerText = UI.REASONING_TITLE;
  var stateSpan = document.createElement('span');
  stateSpan.className = 'reasoning-header-state';
  stateSpan.innerText = initialCollapsed ? UI.REASONING_COLLAPSED : UI.REASONING_EXPANDED;
  header.appendChild(title);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(stateSpan);
  return { header: header, stateSpan: stateSpan };
}

function createReasoningBlockDOM(reasoningContent) {
  var reasoningDiv = document.createElement('div');
  reasoningDiv.className = 'reasoning-block';
  var hdr = createReasoningHeader(false);
  var contentDiv = document.createElement('div');
  contentDiv.className = 'reasoning-text prose-content';
  contentDiv.innerHTML = renderMarkdownToHTML(reasoningContent);
  contentDiv.dataset.collapsed = '0';
  hdr.header.onclick = function () {
    var collapsed = contentDiv.dataset.collapsed === '1';
    collapsed = !collapsed;
    contentDiv.dataset.collapsed = collapsed ? '1' : '0';
    setHidden(contentDiv, collapsed);
    hdr.stateSpan.innerText = collapsed ? UI.REASONING_COLLAPSED : UI.REASONING_EXPANDED;
  };
  reasoningDiv.appendChild(hdr.header);
  reasoningDiv.appendChild(contentDiv);
  return reasoningDiv;
}

/* ---- Helpers ---- */

function isMessageStreaming(msg) {
  return msg.id === state.activeGeneratingMessageId &&
    !(msg.content && msg.content.length > 0) &&
    !(msg.reasoning_content && msg.reasoning_content.length > 0);
}

/* ---- Action icon button factory ---- */

function createActionIconBtn(title, iconSvg, handler, extraClass) {
  var btn = document.createElement('button');
  btn.className = 'action-icon-btn' + (extraClass ? ' ' + extraClass : '');
  btn.title = title;
  btn.innerHTML = iconSvg;
  btn.onclick = handler;
  return btn;
}

/** Sync disabled state of all generation-action buttons with state.isGenerating. */
function syncGenButtonStates() {
  var buttons = document.querySelectorAll('.action-icon-btn.gen-action');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = state.isGenerating;
  }
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

  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_INSERT, ICONS.insert, function () { insertUserMessageAfter(msg.id); }));
  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_EDIT, ICONS.edit, function () { editMessage(msg.id, contentDiv, actionsDiv); }));
  actionsDiv.appendChild(createActionIconBtn(UI.ACTION_DELETE, ICONS.delete, function () { deleteMessage(msg.id); }));

  var sep1 = document.createElement('span');
  sep1.className = 'action-sep';
  actionsDiv.appendChild(sep1);

  var genBtn = createActionIconBtn(UI.ACTION_GENERATE, ICONS.generate, function () { generateNewResponse(msg.id); }, 'gen-action');
  genBtn.disabled = state.isGenerating;
  actionsDiv.appendChild(genBtn);

  if (msg.role === 'assistant') {
    var sep2 = document.createElement('span');
    sep2.className = 'action-sep';
    actionsDiv.appendChild(sep2);
    var prefixBtn = createActionIconBtn(UI.ACTION_PREFIX, ICONS.prefix, function () { prefixCompletion(msg.id); }, 'gen-action');
    prefixBtn.disabled = state.isGenerating;
    actionsDiv.appendChild(prefixBtn);
    var regenBtn = createActionIconBtn(UI.ACTION_REGENERATE, ICONS.regenerate, function () { regenerateAssistant(msg.id); }, 'gen-action');
    regenBtn.disabled = state.isGenerating;
    actionsDiv.appendChild(regenBtn);
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

  if (isMessageStreaming(msg)) {
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

/* === Top-level rendering & edit-mode UI === */

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

function renderEmptyState() {
  var container = DomRefs.chatContainer;
  container.innerHTML = '';

  var emptyState = document.createElement('div');
  emptyState.className = 'empty-state';

  var title = document.createElement('div');
  title.className = 'empty-state-title';
  title.innerText = UI.EMPTY_TITLE;

  var inputRow = document.createElement('div');
  inputRow.className = 'empty-input-row';

  var spacer = document.createElement('div');
  spacer.className = 'empty-input-spacer';
  spacer.setAttribute('aria-hidden', 'true');

  var inputWrapper = document.createElement('div');
  inputWrapper.className = 'empty-input-wrapper';

  var inputShell = document.createElement('div');
  inputShell.className = 'empty-input-shell';

  var textarea = document.createElement('textarea');
  textarea.id = 'emptyInput';
  textarea.placeholder = UI.EMPTY_PLACEHOLDER;
  textarea.rows = 1;
  textarea.autofocus = true;

  var sendBtn = document.createElement('button');
  sendBtn.id = 'emptySendBtn';
  sendBtn.className = 'primary';
  sendBtn.innerText = UI.BTN_SEND;

  sendBtn.onclick = function () {
    if (!textarea.value.trim()) return;
    addUserMessage(textarea.value);
    renderMessages();
  };

  inputShell.appendChild(textarea);
  inputWrapper.appendChild(inputShell);
  inputRow.appendChild(spacer);
  inputRow.appendChild(inputWrapper);
  inputRow.appendChild(sendBtn);
  emptyState.appendChild(title);
  emptyState.appendChild(inputRow);
  container.appendChild(emptyState);

  autoResizeTextarea(textarea, { minHeight: CFG.TEXTAREA_MIN_HEIGHT, maxHeight: CFG.TEXTAREA_MAX_HEIGHT, clampOverflow: true });
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

  var msgDiv = getMessageElement(msgId);
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
      if (isMessageStreaming(msg)) {
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
  var oldDiv = getMessageElement(msgId);
  if (!oldDiv) {
    if (state.messages.length === 0) renderEmptyState();
    else renderMessages();
    return;
  }
  var parts = renderMessageItem(msg);
  oldDiv.parentNode.replaceChild(parts.msgDiv, oldDiv);
  evaluateScrollToBottom();
}

window.createReasoningBlockDOM = createReasoningBlockDOM;
window.isMessageStreaming = isMessageStreaming;
window.createActionIconBtn = createActionIconBtn;
window.syncGenButtonStates = syncGenButtonStates;
window.renderMessageItem = renderMessageItem;
window.createEditModeUI = createEditModeUI;
window.renderMessages = renderMessages;
window.updateSingleMessageDOM = updateSingleMessageDOM;
window.refreshMessageDOM = refreshMessageDOM;
window.renderEmptyState = renderEmptyState;

})();


