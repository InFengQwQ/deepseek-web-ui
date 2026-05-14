/* ================================================================
   events.js — All DOM event bindings in one place
   (config controls, chat actions, scroll, import/export, stop)
   ================================================================ */

(function() {
var App = window.App = window.App || {};

function bindAllEvents() {
  /* ---- Config controls ---- */
  App.DomRefs.thinkingToggle.addEventListener('change', App.updateThinkingUI);
  App.DomRefs.systemPromptInput.addEventListener('input', App.scrollSystemPromptToBottom);
  App.DomRefs.systemPromptBtn.onclick = App.openSystemPromptModal;
  App.DomRefs.systemPromptCloseBtn.onclick = App.closeSystemPromptModal;
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !App.DomRefs.systemPromptModal.classList.contains('u-none')) {
      App.closeSystemPromptModal();
    }
  });
  App.DomRefs.saveConfigBtn.onclick = App.saveConfiguration;

  /* ---- Chat action buttons ---- */
  App.DomRefs.clearHistoryBtn.onclick = App.clearAllMessages;
  App.DomRefs.exportBtn.onclick = App.exportConversation;
  App.DomRefs.importBtn.onclick = App.triggerImportDialog;
  App.DomRefs.stopGenBtn.onclick = App.stopGeneration;

  /* ---- Scroll ---- */
  var scrollTicking = false;
  App.DomRefs.chatContainer.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        App.evaluateScrollToBottom();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });
  App.DomRefs.scrollToBottomBtn.onclick = function () {
    App.DomRefs.chatContainer.scrollTop = App.DomRefs.chatContainer.scrollHeight;
  };
}

App.bindAllEvents = bindAllEvents;


})();
