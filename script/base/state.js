/* ================================================================
   state.js — Central application state, config persistence & state API
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/** Load config from localStorage using CONFIG_SCHEMA as single source of truth. */
function loadConfigFromStorage() {
  var config = {};
  App.forEachConfigSchemaItem(function(item) {
    var raw = localStorage.getItem(item.key);
    config[item.prop] = raw !== null ? (item.parse ? item.parse(raw) : raw) : item.def;
  });
  return config;
}

function persistConfig() {
  var c = App.state.config;
  App.forEachConfigSchemaItem(function(item) {
    localStorage.setItem(item.key, c[item.prop]);
  });
}

/** Central application state. Prefer using the state API methods below
 *  rather than mutating properties directly. */
App.state = {
  messages: [],
  nextId: 1,
  isGenerating: false,
  activeGeneratingMessageId: null,
  currentAbortController: null,
  config: loadConfigFromStorage()
};

/* ---- State mutation API ---- */

var api = App.state;

/** Add a message to the end of the list and persist. */
api.addMessage = function(msg) {
  api.messages = api.messages.concat([msg]);
  api._autoPersist();
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

/** Delegates to App.persistMessages (defined in messages.js). */
api._autoPersist = function() {
  if (App.persistMessages) App.persistMessages();
};

App.persistConfig = persistConfig;

})();
