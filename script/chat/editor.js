/* ================================================================
   editor.js — Inline edit-mode UI & empty-state input row
   ================================================================ */

(function() {
var App = window.App = window.App || {};

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

/** Create the input row (textarea + send button) shown in the empty state. */
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

  sendBtn.onclick = App.safeAsync(function () {
    App.addUserMessage(textarea.value);
    App.renderMessages();
  });

  inputShell.appendChild(textarea);
  inputWrapper.appendChild(inputShell);
  inputRow.appendChild(spacer);
  inputRow.appendChild(inputWrapper);
  inputRow.appendChild(sendBtn);

  App.autoResizeTextarea(textarea, {
    minHeight: App.CFG.TEXTAREA_MIN_HEIGHT,
    maxHeight: App.CFG.TEXTAREA_MAX_HEIGHT,
    clampOverflow: true
  });
  return inputRow;
}

App.createEditModeUI = createEditModeUI;
App.createEmptyStateInputRow = createEmptyStateInputRow;

})();
