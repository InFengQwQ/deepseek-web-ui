/* ================================================================
   render-item.js — Message item DOM rendering:
   reasoning block, version nav, meta, actions, compose item
   ================================================================ */

(function() {

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
  var collapsed = false;
  hdr.header.onclick = function () {
    collapsed = !collapsed;
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

window.createReasoningBlockDOM = createReasoningBlockDOM;
window.isMessageStreaming = isMessageStreaming;
window.createActionIconBtn = createActionIconBtn;
window.syncGenButtonStates = syncGenButtonStates;
window.renderMessageItem = renderMessageItem;

})();
