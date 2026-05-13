/* ================================================================
   emptystate.js — Empty chat state with inline input
   ================================================================ */

(function() {

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

window.renderEmptyState = renderEmptyState;

})();
