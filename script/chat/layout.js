/* ================================================================
   layout.js — Top-level render orchestration:
   full re-render, empty state, incremental streaming update,
   single-message DOM refresh
   ================================================================ */

(function() {
var App = window.App = window.App || {};

function updateContentHtml(msgDiv, msg) {
  var contentDiv = msgDiv.querySelector('.msg-content');
  if (!contentDiv || contentDiv.querySelector('textarea')) return;
  contentDiv.innerHTML = App.getMessageContentHTML(msg);
}

function syncActionsVisibility(msgDiv, msg) {
  var actionsDiv = msgDiv.querySelector('.msg-actions');
  if (actionsDiv) {
    App.setHidden(actionsDiv, msg.id === App.state.activeGeneratingMessageId);
  }
}

/** Incremental DOM update for a single message during streaming. */
function updateSingleMessageDOM(msgId) {
  var msg = App.findMessageById(msgId);
  if (!msg || !App.DomRefs.chatContainer) return;

  var msgDiv = App.getMessageElement(msgId);
  if (!msgDiv) {
    App.refreshMessageDOM(msgId);
    return;
  }

  App.preserveScrollPosition(App.DomRefs.chatContainer, function () {
    App.upsertReasoningBlock(msgDiv, msg);
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
      App.renderEmptyState();
    } else {
      App.renderMessages();
    }
    return;
  }
  var parts = App.renderMessageItem(msg);
  oldDiv.parentNode.replaceChild(parts.msgDiv, oldDiv);
  App.evaluateScrollToBottom();
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
  emptyState.appendChild(App.createEmptyStateInputRow());
  container.appendChild(emptyState);
}

/** Full re-render of all messages from state. */
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
      var parts = App.renderMessageItem(msg);
      App.DomRefs.chatContainer.appendChild(parts.msgDiv);
    });
  });

  App.evaluateScrollToBottom();
}

App.renderMessages = renderMessages;
App.renderEmptyState = renderEmptyState;
App.updateSingleMessageDOM = updateSingleMessageDOM;
App.refreshMessageDOM = refreshMessageDOM;

})();
