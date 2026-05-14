/* ================================================================
   actions.js — Chat actions: message CRUD, import/export
   ================================================================ */

(function() {
var App = window.App = window.App || {};

function triggerImportDialog() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function (e) { if (e.target.files[0]) App.importConversation(e.target.files[0]); };
  input.click();
}

/* ---- Clear all messages ---- */

function clearAllMessages() {
  if (confirm(App.CFG.DIALOG_CONFIRM_CLEAR)) {
    if (App.state.isGenerating) App.stopGeneration();
    App.state.clearMessages();
    App.renderMessages();
    App.setStatus(App.STATUS.CLEARED);
  }
}

/* ---- Export / Import ---- */

function exportConversation() {
  var data = { messages: App.state.messages.map(App.serializeMessageRecord) };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = App.CFG.EXPORT_FILENAME_PREFIX + new Date().toISOString().slice(0, 19) + App.CFG.EXPORT_EXT;
  a.click();
  URL.revokeObjectURL(url);
  App.setStatus(App.STATUS.EXPORTED, App.CFG.STATUS_TIMEOUT_SHORT);
}

function importConversation(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var imported = JSON.parse(e.target.result);
      var msgs = imported.messages;
      if (!Array.isArray(msgs)) throw new Error('无效格式');
      var newMsgs = msgs.map(function (msg) {
        return App.normalizeMessageRecord(Object.assign({}, msg, { id: App.state.nextId++ }));
      });
      App.state.replaceMessages(newMsgs);
      App.renderMessages();
      App.setStatus(App.STATUS.IMPORTED, App.CFG.STATUS_TIMEOUT_LONG);
    } catch (err) {
      App.setStatus(App.STATUS.IMPORT_ERROR_PREFIX + err.message);
    }
  };
  reader.readAsText(file);
}

/* ---- Message CRUD ---- */

function enterEditModeForNewMessages() {
  App.state.messages.forEach(function (msg) {
    if (!msg._isNew) return;
    delete msg._isNew;
    var msgDiv = App.getMessageElement(msg.id);
    if (!msgDiv) return;
    var contentDiv = msgDiv.querySelector('.msg-content');
    var actionsDiv = msgDiv.querySelector('.msg-actions');
    if (contentDiv) editMessage(msg.id, contentDiv, actionsDiv, true);
  });
}

function insertUserMessageAfter(afterMsgId) {
  var idx = App.findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var newMsg = App.createMessage('user', '', { isNew: true });
  App.state.insertMessageAt(idx + 1, newMsg);

  var afterDiv = App.getMessageElement(afterMsgId);
  if (afterDiv) {
    var parts = App.renderMessageItem(newMsg);
    afterDiv.parentNode.insertBefore(parts.msgDiv, afterDiv.nextSibling);
  } else {
    App.renderMessages();
  }
  enterEditModeForNewMessages();
}

function editMessage(msgId, contentDiv, actionsDiv, isNew) {
  var msg = App.findMessageById(msgId);
  if (!msg) return;
  if (contentDiv.querySelector('textarea')) return;

  var ui = App.createEditModeUI(msg, contentDiv, actionsDiv);

  ui.saveBtn.onclick = App.safeAsync(function () {
    var newContent = ui.textarea.value;
    if (msg.role === 'assistant') {
      var version = App.applyCurrentVersion(msg);
      if (version) {
        version.content = newContent;
        version.reasoning_content = msg.reasoning_content || null;
        App.applyCurrentVersion(msg);
      }
    } else {
      msg.content = newContent;
    }
    App.persistMessages();
    App.setStatus(isNew ? App.STATUS.INSERTED : App.STATUS.MODIFIED, App.CFG.STATUS_TIMEOUT_SHORT);
    App.refreshMessageDOM(msg.id);
  });

  ui.cancelBtn.onclick = App.safeAsync(function () {
    if (isNew) {
      deleteMessage(msg.id);
    } else {
      App.refreshMessageDOM(msg.id);
    }
  });
}

function deleteMessage(msgId) {
  if (App.state.removeMessage(msgId)) {
    var msgDiv = App.getMessageElement(msgId);
    if (msgDiv) msgDiv.remove();
    if (App.state.messages.length === 0) App.renderEmptyState();
    App.setStatus(App.STATUS.DELETED);
  }
}

App.triggerImportDialog = triggerImportDialog;
App.clearAllMessages = clearAllMessages;
App.exportConversation = exportConversation;
App.importConversation = importConversation;
App.enterEditModeForNewMessages = enterEditModeForNewMessages;
App.insertUserMessageAfter = insertUserMessageAfter;
App.editMessage = editMessage;
App.deleteMessage = deleteMessage;

})();
