/* ================================================================
   config.js — Configuration UI: system prompt modal, thinking toggle,
   config sync/save
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/* ---- System prompt modal ---- */

function scrollSystemPromptToBottom() {
  if (!App.DomRefs.systemPromptInput) return;
  requestAnimationFrame(function () {
    App.DomRefs.systemPromptInput.scrollTop = App.DomRefs.systemPromptInput.scrollHeight;
  });
}

function openSystemPromptModal() {
  if (!App.DomRefs.systemPromptModal || !App.DomRefs.systemPromptInput) return;
  App.DomRefs.systemPromptInput.value = App.state.config.systemPrompt;
  App.setHidden(App.DomRefs.systemPromptModal, false);
  App.DomRefs.systemPromptModal.setAttribute('aria-hidden', 'false');
  App.DomRefs.systemPromptInput.focus();
  scrollSystemPromptToBottom();
}

function closeSystemPromptModal() {
  if (!App.DomRefs.systemPromptModal) return;
  App.setHidden(App.DomRefs.systemPromptModal, true);
  App.DomRefs.systemPromptModal.setAttribute('aria-hidden', 'true');
}

/* ---- Thinking / temperature UI toggle ---- */

function updateThinkingUI() {
  if (!App.DomRefs.thinkingToggle) return;
  var enabled = App.DomRefs.thinkingToggle.checked;
  App.setHidden(App.DomRefs.effortField, !enabled);
  App.setHidden(App.DomRefs.tempField, enabled);
}

/* ---- Config sync & save ---- */

/** Iterate CONFIG_SCHEMA to sync state → UI. */
function syncConfigToUI() {
  App.forEachConfigSchemaItem(function(item) {
    var el = document.getElementById(item.elId);
    if (!el) return;
    var setter = item.uiSet || function(el, v) { el.value = v; };
    setter(el, App.state.config[item.prop]);
  });
  if (App.DomRefs.systemPromptModal && !App.DomRefs.systemPromptModal.classList.contains('u-none')) {
    scrollSystemPromptToBottom();
  }
  updateThinkingUI();
}

/** Iterate CONFIG_SCHEMA to save UI → state, then persist. */
function saveConfiguration() {
  App.forEachConfigSchemaItem(function(item) {
    var el = document.getElementById(item.elId);
    if (!el) return;
    var getter = item.uiGet || function(el) { return el.value; };
    var val = getter(el);
    if (val !== null) App.state.config[item.prop] = val;
  });
  App.persistConfig();
  closeSystemPromptModal();
  App.setStatus(App.STATUS.SAVED, App.CFG.STATUS_TIMEOUT_SHORT);
}

App.scrollSystemPromptToBottom = scrollSystemPromptToBottom;
App.openSystemPromptModal = openSystemPromptModal;
App.closeSystemPromptModal = closeSystemPromptModal;
App.updateThinkingUI = updateThinkingUI;
App.syncConfigToUI = syncConfigToUI;
App.saveConfiguration = saveConfiguration;

})();
