/* ================================================================
   config.js — Configuration UI: system prompt modal, thinking toggle,
   config sync/save
   ================================================================ */

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

function syncConfigToUI() {
  DomRefs.apiKeyInput.value = state.config.apiKey;
  DomRefs.modelSelect.value = state.config.model;
  DomRefs.thinkingToggle.checked = state.config.thinkingEnabled;
  DomRefs.effortSelect.value = state.config.reasoningEffort;
  DomRefs.tempInput.value = state.config.temperature;
  DomRefs.systemPromptInput.value = state.config.systemPrompt;
  scrollSystemPromptToBottom();
  updateThinkingUI();
}

function saveConfiguration() {
  state.config.apiKey = DomRefs.apiKeyInput.value.trim();
  state.config.model = DomRefs.modelSelect.value;
  state.config.thinkingEnabled = DomRefs.thinkingToggle.checked;
  state.config.reasoningEffort = DomRefs.effortSelect.value;
  state.config.systemPrompt = DomRefs.systemPromptInput.value;
  var newTemp = parseFloat(DomRefs.tempInput.value);
  if (!isNaN(newTemp)) state.config.temperature = newTemp;
  persistConfig();
  closeSystemPromptModal();
  setStatus(CONST.STATUS_SAVED, CONST.STATUS_TIMEOUT_SHORT);
}

