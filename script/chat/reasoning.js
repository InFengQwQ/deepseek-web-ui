/* ================================================================
   reasoning.js — Reasoning block DOM: create & incremental
   upsert during streaming
   ================================================================ */

(function() {
var App = window.App = window.App || {};

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

/** Insert or update a reasoning block inside a message div during streaming. */
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

App.createReasoningBlockDOM = createReasoningBlockDOM;
App.upsertReasoningBlock = upsertReasoningBlock;

})();
