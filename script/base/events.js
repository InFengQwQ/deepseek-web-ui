/* ================================================================
   events.js — All DOM event bindings in one place
   (config controls, chat actions, scroll, import/export, stop)
   ================================================================ */

(function() {

function bindAllEvents() {
  /* ---- Config controls ---- */
  DomRefs.thinkingToggle.addEventListener('change', updateThinkingUI);
  DomRefs.systemPromptInput.addEventListener('input', scrollSystemPromptToBottom);
  DomRefs.systemPromptBtn.onclick = openSystemPromptModal;
  DomRefs.systemPromptCloseBtn.onclick = closeSystemPromptModal;
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !DomRefs.systemPromptModal.classList.contains('u-none')) {
      closeSystemPromptModal();
    }
  });
  DomRefs.saveBtn.onclick = saveConfiguration;

  /* ---- Chat action buttons ---- */
  DomRefs.clearBtn.onclick = clearAllMessages;
  DomRefs.exportBtn.onclick = exportConversation;
  DomRefs.importBtn.onclick = function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) { if (e.target.files[0]) importConversation(e.target.files[0]); };
    input.click();
  };
  DomRefs.stopBtn.onclick = stopGeneration;

  /* ---- Scroll ---- */
  var scrollTicking = false;
  DomRefs.chatContainer.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        evaluateScrollToBottom();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });
  DomRefs.scrollToBottomBtn.onclick = function () {
    DomRefs.chatContainer.scrollTop = DomRefs.chatContainer.scrollHeight;
  };
}

window.bindAllEvents = bindAllEvents;

})();
