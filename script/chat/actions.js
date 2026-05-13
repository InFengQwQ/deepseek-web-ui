/* ================================================================
   actions.js — Chat actions: message CRUD, import/export
   ================================================================ */

(function() {

/* ---- Clear all messages ---- */

function clearAllMessages() {
  if (confirm(CFG.DIALOG_CONFIRM_CLEAR)) {
    state.clearMessages();
    renderMessages();
    setStatus(STATUS.CLEARED);
  }
}

/* ---- Export / Import ---- */

function exportConversation() {
  var data = { messages: state.messages.map(serializeMessageRecord) };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = CFG.EXPORT_FILENAME_PREFIX + new Date().toISOString().slice(0, 19) + CFG.EXPORT_EXT;
  a.click();
  URL.revokeObjectURL(url);
  setStatus(STATUS.EXPORTED, CFG.STATUS_TIMEOUT_SHORT);
}

function importConversation(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var imported = JSON.parse(e.target.result);
      var msgs = imported.messages;
      if (!Array.isArray(msgs)) throw new Error('无效格式');
      var newMsgs = msgs.map(function (msg) {
        return normalizeMessageRecord({
          id: state.nextId++,
          role: msg.role,
          content: msg.content,
          reasoning_content: msg.reasoning_content || null,
          createdAt: msg.createdAt,
          versions: msg.versions,
          currentVersionIndex: msg.currentVersionIndex
        });
      });
      state.replaceMessages(newMsgs);
      renderMessages();
      setStatus(STATUS.IMPORTED, CFG.STATUS_TIMEOUT_LONG);
    } catch (err) {
      setStatus(STATUS.IMPORT_ERROR_PREFIX + err.message);
    }
  };
  reader.readAsText(file);
}

/* ---- Message CRUD ---- */

function enterEditModeForNewMessages() {
  state.messages.forEach(function (msg) {
    if (!msg._isNew) return;
    delete msg._isNew;
    var msgDiv = getMessageElement(msg.id);
    if (!msgDiv) return;
    var contentDiv = msgDiv.querySelector('.msg-content');
    var actionsDiv = msgDiv.querySelector('.msg-actions');
    if (contentDiv) editMessage(msg.id, contentDiv, actionsDiv, true);
  });
}

function insertUserMessageAfter(afterMsgId) {
  var idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var newMsg = createMessage('user', '', { isNew: true });
  state.insertMessageAt(idx + 1, newMsg);

  var afterDiv = getMessageElement(afterMsgId);
  if (afterDiv) {
    var parts = renderMessageItem(newMsg);
    afterDiv.parentNode.insertBefore(parts.msgDiv, afterDiv.nextSibling);
  } else {
    renderMessages();
  }
  enterEditModeForNewMessages();
}

function editMessage(msgId, contentDiv, actionsDiv, isNew) {
  var msg = findMessageById(msgId);
  if (!msg) return;
  if (contentDiv.querySelector('textarea')) return;

  var ui = createEditModeUI(msg, contentDiv, actionsDiv);

  ui.saveBtn.onclick = function () {
    var newContent = ui.textarea.value;
    if (msg.role === 'assistant') {
      var version = applyCurrentVersion(msg);
      if (version) {
        version.content = newContent;
        version.reasoning_content = msg.reasoning_content || null;
        applyCurrentVersion(msg);
      }
    } else {
      msg.content = newContent;
    }
    persistMessages();
    setStatus(isNew ? STATUS.INSERTED : STATUS.MODIFIED, CFG.STATUS_TIMEOUT_SHORT);
    refreshMessageDOM(msg.id);
  };

  ui.cancelBtn.onclick = function () {
    if (isNew) {
      deleteMessage(msg.id);
    } else {
      refreshMessageDOM(msg.id);
    }
  };
}

function deleteMessage(msgId) {
  if (state.removeMessage(msgId)) {
    var msgDiv = getMessageElement(msgId);
    if (msgDiv) msgDiv.remove();
    if (state.messages.length === 0) renderEmptyState();
    setStatus(STATUS.DELETED);
  }
}

window.clearAllMessages = clearAllMessages;
window.exportConversation = exportConversation;
window.importConversation = importConversation;
window.enterEditModeForNewMessages = enterEditModeForNewMessages;
window.insertUserMessageAfter = insertUserMessageAfter;
window.editMessage = editMessage;
window.deleteMessage = deleteMessage;

})();
