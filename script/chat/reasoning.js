/* ================================================================
   reasoning.js — Reasoning block DOM rendering (collapsible)
   ================================================================ */

(function() {

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

window.createReasoningBlockDOM = createReasoningBlockDOM;

})();
