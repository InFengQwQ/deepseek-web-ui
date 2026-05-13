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
  App.DomRefs.saveBtn.onclick = App.saveConfiguration;

  /* ---- Chat action buttons ---- */
  App.DomRefs.clearBtn.onclick = App.clearAllMessages;
  App.DomRefs.exportBtn.onclick = App.exportConversation;
  App.DomRefs.importBtn.onclick = function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) { if (e.target.files[0]) App.importConversation(e.target.files[0]); };
    input.click();
  };
  App.DomRefs.stopBtn.onclick = App.stopGeneration;

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

/* ---- Bootstrap (merged from app.js) ---- */

function bootstrapApp() {
  try {
    App.initDomRefs();
    App.loadMessagesFromStorage();
    App.syncConfigToUI();
    App.renderMessages();
    bindAllEvents();
  } catch (e) {
    console.error('Bootstrap failed:', e);
    if (App.DomRefs.statusSpan) App.DomRefs.statusSpan.innerText = App.STATUS.BOOTSTRAP_ERROR_PREFIX + (e.message || e);
  }
}

bootstrapApp();

})();
