/* ================================================================
   config.js — Configuration UI: system prompt modal, thinking toggle,
   config sync/save
   ================================================================ */

(function() {

/* ---- System prompt modal ---- */

function scrollSystemPromptToBottom() {
  if (!DomRefs.systemPromptInput) return;
  requestAnimationFrame(function () {
    DomRefs.systemPromptInput.scrollTop = DomRefs.systemPromptInput.scrollHeight;
  });
}

function openSystemPromptModal() {
  if (!DomRefs.systemPromptModal || !DomRefs.systemPromptInput) return;
  DomRefs.systemPromptInput.value = state.config.systemPrompt;
  setHidden(DomRefs.systemPromptModal, false);
  DomRefs.systemPromptModal.setAttribute('aria-hidden', 'false');
  DomRefs.systemPromptInput.focus();
  scrollSystemPromptToBottom();
}

function closeSystemPromptModal() {
  if (!DomRefs.systemPromptModal) return;
  setHidden(DomRefs.systemPromptModal, true);
  DomRefs.systemPromptModal.setAttribute('aria-hidden', 'true');
}

/* ---- Thinking / temperature UI toggle ---- */

function updateThinkingUI() {
  if (!DomRefs.thinkingToggle) return;
  var enabled = DomRefs.thinkingToggle.checked;
  setHidden(DomRefs.effortField, !enabled);
  setHidden(DomRefs.tempField, enabled);
}

/* ---- Config sync & save ---- */

/** Iterate CONFIG_SCHEMA to sync state → UI. */
function syncConfigToUI() {
  for (var i = 0; i < CONFIG_SCHEMA.length; i++) {
    var item = CONFIG_SCHEMA[i];
    var el = document.getElementById(item.elId);
    if (!el) continue;
    var setter = item.uiSet || function(el, v) { el.value = v; };
    setter(el, state.config[item.prop]);
  }
  if (DomRefs.systemPromptModal && !DomRefs.systemPromptModal.classList.contains('u-none')) {
    scrollSystemPromptToBottom();
  }
  updateThinkingUI();
}

/** Iterate CONFIG_SCHEMA to save UI → state, then persist. */
function saveConfiguration() {
  for (var i = 0; i < CONFIG_SCHEMA.length; i++) {
    var item = CONFIG_SCHEMA[i];
    var el = document.getElementById(item.elId);
    if (!el) continue;
    var getter = item.uiGet || function(el) { return el.value; };
    var val = getter(el);
    if (val !== null) state.config[item.prop] = val;
  }
  persistConfig();
  closeSystemPromptModal();
  setStatus(STATUS.SAVED, CFG.STATUS_TIMEOUT_SHORT);
}

window.scrollSystemPromptToBottom = scrollSystemPromptToBottom;
window.openSystemPromptModal = openSystemPromptModal;
window.closeSystemPromptModal = closeSystemPromptModal;
window.updateThinkingUI = updateThinkingUI;
window.syncConfigToUI = syncConfigToUI;
window.saveConfiguration = saveConfiguration;

})();

