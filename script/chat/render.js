/* ================================================================
   render.js — Message rendering: item DOM, reasoning block, version
   nav, meta, actions, top-level rendering, incremental updates,
   edit-mode UI
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/* ---- Item-level rendering ---- */

/* ---- Reasoning block DOM rendering ---- */

function createReasoningHeader() {
  var header = document.createElement('div');
  header.className = 'reasoning-header';
  var title = document.createElement('span');
  title.innerText = App.UI.REASONING_TITLE;
  var stateSpan = document.createElement('span');
  stateSpan.className = 'reasoning-header-state';
  stateSpan.innerText = App.UI.REASONING_EXPANDED;
  header.appendChild(title);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(stateSpan);
  return { header: header, stateSpan: stateSpan };
}

function createReasoningBlockDOM(reasoningContent) {
  var reasoningDiv = document.createElement('div');
  reasoningDiv.className = 'reasoning-block';
  var hdr = createReasoningHeader();
  var contentDiv = document.createElement('div');
  contentDiv.className = 'reasoning-text prose-content';
  contentDiv.innerHTML = App.renderMarkdownToHTML(reasoningContent);
  contentDiv.dataset.collapsed = '0';
  hdr.header.onclick = function () {
    var collapsed = contentDiv.dataset.collapsed === '1';
    collapsed = !collapsed;
    contentDiv.dataset.collapsed = collapsed ? '1' : '0';
    App.setHidden(contentDiv, collapsed);
    hdr.stateSpan.innerText = collapsed ? App.UI.REASONING_COLLAPSED : App.UI.REASONING_EXPANDED;
  };
  reasoningDiv.appendChild(hdr.header);
  reasoningDiv.appendChild(contentDiv);
  return reasoningDiv;
}

/* ---- Helpers ---- */

function isMessageStreaming(msg) {
  return msg.id === App.state.activeGeneratingMessageId &&
    !(msg.content && msg.content.length > 0) &&
    !(msg.reasoning_content && msg.reasoning_content.length > 0);
}

/** Shared content HTML: typing indicator during streaming, rendered markdown otherwise. */
function getMessageContentHTML(msg) {
  return isMessageStreaming(msg)
    ? '<span class="typing-indicator"></span>'
    : App.renderMarkdownToHTML(msg.content);
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
    buttons[i].disabled = App.state.isGenerating;
  }
}

/* ---- Sub-renderers ---- */

function renderMessageMeta(msg) {
  var metaDiv = document.createElement('div');
  metaDiv.className = 'msg-meta';

  var roleSpan = document.createElement('span');
  roleSpan.className = 'msg-role ' + msg.role;
  roleSpan.innerText = msg.role === 'user' ? App.UI.ROLE_USER : App.UI.ROLE_ASSISTANT;

  var timeSpan = document.createElement('span');
  timeSpan.className = 'msg-time';
  timeSpan.innerText = App.formatMessageTime(msg.createdAt);

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

  var info = App.getVersionInfo(msg);

  versionLabel.innerText = (Math.min(info.current + 1, info.count)) + '/' + info.count;
  prevBtn.disabled = info.current <= 0;
  nextBtn.disabled = info.current >= info.count - 1;

  prevBtn.onclick = function () { App.setAssistantVersion(msg, info.current - 1); };
  nextBtn.onclick = function () { App.setAssistantVersion(msg, info.current + 1); };

  versionNav.appendChild(prevBtn);
  versionNav.appendChild(versionLabel);
  versionNav.appendChild(nextBtn);

  return versionNav;
}

function renderMessageActions(msg, contentDiv) {
  var actionsDiv = document.createElement('div');
  actionsDiv.className = 'msg-actions';

  actionsDiv.appendChild(createActionIconBtn(App.UI.ACTION_INSERT, App.ICONS.insert, function () { App.insertUserMessageAfter(msg.id); }));
  actionsDiv.appendChild(createActionIconBtn(App.UI.ACTION_EDIT, App.ICONS.edit, function () { App.editMessage(msg.id, contentDiv, actionsDiv); }));
  actionsDiv.appendChild(createActionIconBtn(App.UI.ACTION_DELETE, App.ICONS.delete, function () { App.deleteMessage(msg.id); }));

  var sep1 = document.createElement('span');
  sep1.className = 'action-sep';
  actionsDiv.appendChild(sep1);

  var genBtn = createActionIconBtn(App.UI.ACTION_GENERATE, App.ICONS.generate, App.safeAsync(function () { return App.generateNewResponse(msg.id); }), 'gen-action');
  genBtn.disabled = App.state.isGenerating;
  actionsDiv.appendChild(genBtn);

  if (msg.role === 'assistant') {
    var sep2 = document.createElement('span');
    sep2.className = 'action-sep';
    actionsDiv.appendChild(sep2);
    var prefixBtn = createActionIconBtn(App.UI.ACTION_PREFIX, App.ICONS.prefix, App.safeAsync(function () { return App.prefixCompletion(msg.id); }), 'gen-action');
    prefixBtn.disabled = App.state.isGenerating;
    actionsDiv.appendChild(prefixBtn);
    var regenBtn = createActionIconBtn(App.UI.ACTION_REGENERATE, App.ICONS.regenerate, App.safeAsync(function () { return App.regenerateAssistant(msg.id); }), 'gen-action');
    regenBtn.disabled = App.state.isGenerating;
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
  contentDiv.innerHTML = getMessageContentHTML(msg);
  msgDiv.appendChild(contentDiv);

  var actionsDiv = renderMessageActions(msg, contentDiv);
  App.setHidden(actionsDiv, msg.id === App.state.activeGeneratingMessageId);
  msgDiv.appendChild(actionsDiv);

  return { msgDiv: msgDiv, contentDiv: contentDiv, actionsDiv: actionsDiv };
}

/* ---- Top-level rendering & edit-mode UI ---- */

/** Build inline-edit UI (textarea + save/cancel) inside a message content div. */
function createEditModeUI(msg, contentDiv, actionsDiv) {
  var textarea = document.createElement('textarea');
  textarea.className = 'compact-textarea message-edit-textarea';
  textarea.value = msg.content;

  var saveBtn = document.createElement('button');
  saveBtn.className = 'small primary message-edit-save';
  saveBtn.innerText = App.UI.BTN_SAVE;

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'small';
  cancelBtn.innerText = App.UI.BTN_CANCEL;

  var editActions = document.createElement('div');
  editActions.className = 'message-edit-actions';
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);
  contentDiv.appendChild(editActions);

  App.autoResizeTextarea(textarea);

  if (actionsDiv) {
    actionsDiv.style.opacity = '0';
  }
  textarea.focus();

  return { textarea: textarea, saveBtn: saveBtn, cancelBtn: cancelBtn };
}

function createEmptyStateInputRow() {
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
  textarea.placeholder = App.UI.EMPTY_PLACEHOLDER;
  textarea.rows = 1;
  textarea.autofocus = true;

  var sendBtn = document.createElement('button');
  sendBtn.id = 'emptySendBtn';
  sendBtn.className = 'primary';
  sendBtn.innerText = App.UI.BTN_SEND;

  sendBtn.onclick = function () {
    App.addUserMessage(textarea.value);
    App.renderMessages();
  };

  inputShell.appendChild(textarea);
  inputWrapper.appendChild(inputShell);
  inputRow.appendChild(spacer);
  inputRow.appendChild(inputWrapper);
  inputRow.appendChild(sendBtn);

  App.autoResizeTextarea(textarea, { minHeight: App.CFG.TEXTAREA_MIN_HEIGHT, maxHeight: App.CFG.TEXTAREA_MAX_HEIGHT, clampOverflow: true });
  return inputRow;
}

function renderEmptyState() {
  var container = App.DomRefs.chatContainer;
  container.innerHTML = '';

  var emptyState = document.createElement('div');
  emptyState.className = 'empty-state';

  var title = document.createElement('div');
  title.className = 'empty-state-title';
  title.innerText = App.UI.EMPTY_TITLE;

  emptyState.appendChild(title);
  emptyState.appendChild(createEmptyStateInputRow());
  container.appendChild(emptyState);
}

/* ---- Main render entry point ---- */

function renderMessages() {
  if (!App.DomRefs.chatContainer) return;

  if (App.state.messages.length === 0) {
    renderEmptyState();
    requestAnimationFrame(function () { App.evaluateScrollToBottom(); });
    return;
  }

  App.preserveScrollPosition(App.DomRefs.chatContainer, function () {
    App.DomRefs.chatContainer.innerHTML = '';
    App.state.messages.forEach(function (msg) {
      var parts = renderMessageItem(msg);
      App.DomRefs.chatContainer.appendChild(parts.msgDiv);
    });
  });

  App.evaluateScrollToBottom();
}

/* ---- Incremental update (called during streaming) ---- */

function upsertReasoningBlock(msgDiv, msg) {
  if (msg.role !== 'assistant' || !msg.reasoning_content || !msg.reasoning_content.trim()) return;
  var reasoningDiv = msgDiv.querySelector('.reasoning-block');
  if (!reasoningDiv) {
    reasoningDiv = createReasoningBlockDOM(msg.reasoning_content);
    var existingContent = msgDiv.querySelector('.msg-content');
    msgDiv.insertBefore(reasoningDiv, existingContent);
  } else {
    var textDiv = reasoningDiv.querySelector('.reasoning-text');
    if (textDiv) {
      textDiv.innerHTML = App.renderMarkdownToHTML(msg.reasoning_content);
    }
  }
}

function updateContentHtml(msgDiv, msg) {
  var contentDiv = msgDiv.querySelector('.msg-content');
  if (!contentDiv || contentDiv.querySelector('textarea')) return;
  contentDiv.innerHTML = getMessageContentHTML(msg);
}

function syncActionsVisibility(msgDiv, msg) {
  var actionsDiv = msgDiv.querySelector('.msg-actions');
  if (actionsDiv) {
    App.setHidden(actionsDiv, msg.id === App.state.activeGeneratingMessageId);
  }
}

function updateSingleMessageDOM(msgId) {
  var msg = App.findMessageById(msgId);
  if (!msg || !App.DomRefs.chatContainer) return;

  var msgDiv = App.getMessageElement(msgId);
  if (!msgDiv) {
    App.refreshMessageDOM(msgId);
    return;
  }

  App.preserveScrollPosition(App.DomRefs.chatContainer, function () {
    upsertReasoningBlock(msgDiv, msg);
    updateContentHtml(msgDiv, msg);
    syncActionsVisibility(msgDiv, msg);
  });

  App.evaluateScrollToBottom();
}

/** Replace a single message's DOM element with a fresh render from state. */
function refreshMessageDOM(msgId) {
  var msg = App.findMessageById(msgId);
  if (!msg) return;
  var oldDiv = App.getMessageElement(msgId);
  if (!oldDiv) {
    if (App.state.messages.length === 0) {
      renderEmptyState();
    }
    else App.renderMessages();
    return;
  }
  var parts = renderMessageItem(msg);
  oldDiv.parentNode.replaceChild(parts.msgDiv, oldDiv);
  App.evaluateScrollToBottom();
}

App.syncGenButtonStates = syncGenButtonStates;
App.renderMessageItem = renderMessageItem;
App.createEditModeUI = createEditModeUI;
App.renderMessages = renderMessages;
App.updateSingleMessageDOM = updateSingleMessageDOM;
App.refreshMessageDOM = refreshMessageDOM;
App.renderEmptyState = renderEmptyState;

})();
