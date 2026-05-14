/* ================================================================
   msgcard.js — Single message DOM construction: meta, version
   nav, content, action buttons
   ================================================================ */

(function() {
var App = window.App = window.App || {};

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

  actionsDiv.appendChild(App.createActionIconBtn(App.UI.ACTION_INSERT, App.ICONS.insert, App.safeAsync(function () { App.insertUserMessageAfter(msg.id); })));
  actionsDiv.appendChild(App.createActionIconBtn(App.UI.ACTION_EDIT, App.ICONS.edit, App.safeAsync(function () { App.editMessage(msg.id, contentDiv, actionsDiv); })));
  actionsDiv.appendChild(App.createActionIconBtn(App.UI.ACTION_DELETE, App.ICONS.delete, App.safeAsync(function () { App.deleteMessage(msg.id); })));

  var sep1 = document.createElement('span');
  sep1.className = 'action-sep';
  actionsDiv.appendChild(sep1);

  var genBtn = App.createActionIconBtn(App.UI.ACTION_GENERATE, App.ICONS.generate, App.safeAsync(function () { return App.generateNewResponse(msg.id); }), 'gen-action');
  genBtn.disabled = App.state.isGenerating;
  actionsDiv.appendChild(genBtn);

  if (msg.role === 'assistant') {
    var sep2 = document.createElement('span');
    sep2.className = 'action-sep';
    actionsDiv.appendChild(sep2);
    var prefixBtn = App.createActionIconBtn(App.UI.ACTION_PREFIX, App.ICONS.prefix, App.safeAsync(function () { return App.prefixCompletion(msg.id); }), 'gen-action');
    prefixBtn.disabled = App.state.isGenerating;
    actionsDiv.appendChild(prefixBtn);
    var regenBtn = App.createActionIconBtn(App.UI.ACTION_REGENERATE, App.ICONS.regenerate, App.safeAsync(function () { return App.regenerateAssistant(msg.id); }), 'gen-action');
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
    msgDiv.appendChild(App.createReasoningBlockDOM(msg.reasoning_content));
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

App.getMessageContentHTML = getMessageContentHTML;
App.renderMessageItem = renderMessageItem;

})();
