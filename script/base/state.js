/* ================================================================
   state.js — Central application state & config persistence
   ================================================================ */

/** Central application state — direct property access. */
var state = {
  messages: [],
  nextId: 1,
  isGenerating: false,
  activeGeneratingMessageId: null,
  currentAbortController: null,
  config: {
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || '',
    model: localStorage.getItem(STORAGE_KEYS.model) || 'deepseek-v4-pro',
    thinkingEnabled: localStorage.getItem(STORAGE_KEYS.thinking) === 'true',
    reasoningEffort: localStorage.getItem(STORAGE_KEYS.reasoningEffort) || 'max',
    temperature: parseFloat(localStorage.getItem(STORAGE_KEYS.temperature) || String(CONST.API_DEFAULT_TEMP)),
    systemPrompt: localStorage.getItem(STORAGE_KEYS.systemPrompt) || ''
  }
};

/** Persist current config to localStorage. */
function persistConfig() {
  var c = state.config;
  localStorage.setItem(STORAGE_KEYS.apiKey, c.apiKey);
  localStorage.setItem(STORAGE_KEYS.model, c.model);
  localStorage.setItem(STORAGE_KEYS.thinking, c.thinkingEnabled);
  localStorage.setItem(STORAGE_KEYS.reasoningEffort, c.reasoningEffort);
  localStorage.setItem(STORAGE_KEYS.systemPrompt, c.systemPrompt);
  localStorage.setItem(STORAGE_KEYS.temperature, c.temperature);
}
