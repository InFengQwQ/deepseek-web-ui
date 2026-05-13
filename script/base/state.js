/* ================================================================
   state.js — Central application state, config persistence & state API
   ================================================================ */

(function() {

function loadConfigFromStorage() {
  return {
    apiKey:           localStorage.getItem(STORAGE_KEYS.apiKey) || '',
    model:            localStorage.getItem(STORAGE_KEYS.model) || 'deepseek-v4-pro',
    thinkingEnabled:  localStorage.getItem(STORAGE_KEYS.thinking) === 'true',
    reasoningEffort:  localStorage.getItem(STORAGE_KEYS.reasoningEffort) || 'max',
    temperature:      parseFloat(localStorage.getItem(STORAGE_KEYS.temperature)) || CFG.API_DEFAULT_TEMP,
    systemPrompt:     localStorage.getItem(STORAGE_KEYS.systemPrompt) || ''
  };
}

function persistConfig() {
  var c = window.state.config;
  localStorage.setItem(STORAGE_KEYS.apiKey,          c.apiKey);
  localStorage.setItem(STORAGE_KEYS.model,           c.model);
  localStorage.setItem(STORAGE_KEYS.thinking,        String(c.thinkingEnabled));
  localStorage.setItem(STORAGE_KEYS.reasoningEffort, c.reasoningEffort);
  localStorage.setItem(STORAGE_KEYS.temperature,     c.temperature);
  localStorage.setItem(STORAGE_KEYS.systemPrompt,    c.systemPrompt);
}

/** Central application state. Prefer using the state API methods below
 *  rather than mutating properties directly. */
window.state = {
  messages: [],
  nextId: 1,
  isGenerating: false,
  activeGeneratingMessageId: null,
  currentAbortController: null,
  config: loadConfigFromStorage()
};

/* ---- State mutation API ---- */

var api = window.state;

/** Add a message to the end of the list and persist. */
api.addMessage = function(msg) {
  api.messages = api.messages.concat([msg]);
  if (typeof window.persistMessages === 'function') window.persistMessages();
  return msg;
};

/** Remove a message by id. Returns true if removed. */
api.removeMessage = function(id) {
  for (var i = 0; i < api.messages.length; i++) {
    if (api.messages[i].id === id) {
      api.messages = api.messages.slice(0, i).concat(api.messages.slice(i + 1));
      api._autoPersist();
      return true;
    }
  }
  return false;
};

/** Insert a message at an index and persist. */
api.insertMessageAt = function(index, msg) {
  var arr = api.messages.slice();
  arr.splice(index, 0, msg);
  api.messages = arr;
  api._autoPersist();
};

/** Replace the entire message list and persist. */
api.replaceMessages = function(msgs) {
  api.messages = msgs;
  api._autoPersist();
};

/** Clear all messages and reset id counter. */
api.clearMessages = function() {
  api.messages = [];
  api.nextId = 1;
  api._autoPersist();
};

/** Enter generating state for a message id. */
api.beginGeneration = function(msgId) {
  api.isGenerating = true;
  api.activeGeneratingMessageId = msgId;
};

/** Exit generating state. */
api.endGeneration = function() {
  api.isGenerating = false;
  api.activeGeneratingMessageId = null;
  api.currentAbortController = null;
};

/** Set the current AbortController. */
api.setAbortController = function(ctrl) {
  api.currentAbortController = ctrl;
};

/** Explicit persistence callback — registered by messages.js after load. */
api._persist = null;
api._autoPersist = function() {
  if (typeof api._persist === 'function') api._persist();
};

window.persistConfig = persistConfig;

})();
