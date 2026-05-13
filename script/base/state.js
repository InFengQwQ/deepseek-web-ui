/* ================================================================
   state.js — Central application state & config persistence
   ================================================================ */

(function() {

/** Config schema — single source of truth mapping config properties to storage keys & defaults. */
var CONFIG_SCHEMA = [
  { prop: 'apiKey',           key: STORAGE_KEYS.apiKey,           def: '',                    parse: null },
  { prop: 'model',            key: STORAGE_KEYS.model,            def: 'deepseek-v4-pro',     parse: null },
  { prop: 'thinkingEnabled',  key: STORAGE_KEYS.thinking,         def: false,                  parse: function(v) { return v === 'true'; } },
  { prop: 'reasoningEffort',  key: STORAGE_KEYS.reasoningEffort,  def: 'max',                  parse: null },
  { prop: 'temperature',      key: STORAGE_KEYS.temperature,      def: CFG.API_DEFAULT_TEMP,   parse: parseFloat },
  { prop: 'systemPrompt',     key: STORAGE_KEYS.systemPrompt,     def: '',                    parse: null }
];

function loadConfigFromStorage() {
  var config = {};
  for (var i = 0; i < CONFIG_SCHEMA.length; i++) {
    var item = CONFIG_SCHEMA[i];
    var stored = localStorage.getItem(item.key);
    config[item.prop] = stored !== null ? (item.parse ? item.parse(stored) : stored) : item.def;
  }
  return config;
}

/** Central application state — direct property access. */
window.state = {
  messages: [],
  nextId: 1,
  isGenerating: false,
  activeGeneratingMessageId: null,
  currentAbortController: null,
  config: loadConfigFromStorage()
};

/** Persist current config to localStorage. */
function persistConfig() {
  var c = state.config;
  for (var i = 0; i < CONFIG_SCHEMA.length; i++) {
    var item = CONFIG_SCHEMA[i];
    localStorage.setItem(item.key, c[item.prop]);
  }
}

window.persistConfig = persistConfig;

})();
