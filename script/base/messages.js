/* ================================================================
   messages.js — Message creation, query, serialization,
   and localStorage persistence
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/** Sanitize core message fields with type-safe defaults. */
function sanitizeMessageFields(source) {
  return {
    role: source.role,
    content: typeof source.content === 'string' ? source.content : '',
    reasoning_content: typeof source.reasoning_content === 'string' ? source.reasoning_content : null,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString()
  };
}

/* ---- Message creation & query ---- */

function messageCoreFields(msg) {
  return {
    role: msg.role,
    content: msg.content,
    reasoning_content: msg.reasoning_content || null,
    createdAt: msg.createdAt
  };
}

function serializeMessageRecord(msg) {
  var record = messageCoreFields(msg);
  record.id = msg.id;
  if (msg.role === 'assistant') {
    if (Array.isArray(msg.versions)) record.versions = msg.versions.map(App.cloneVersionEntry);
    if (Number.isInteger(msg.currentVersionIndex)) record.currentVersionIndex = msg.currentVersionIndex;
  }
  return record;
}

function createMessage(role, content, options) {
  if (content === undefined) content = '';
  if (options === undefined) options = {};
  var fields = sanitizeMessageFields({ role: role, content: content, reasoning_content: options.reasoning_content, createdAt: options.createdAt });
  return {
    id: Number.isFinite(options.id) ? options.id : App.state.nextId++,
    role: fields.role,
    content: fields.content,
    reasoning_content: fields.reasoning_content,
    createdAt: fields.createdAt,
    _isNew: !!options.isNew
  };
}

function findMessageById(messageId) {
  return App.state.messages.find(function(m) { return m.id === messageId; }) || null;
}

function findMessageIndexById(messageId) {
  return App.state.messages.findIndex(function(m) { return m.id === messageId; });
}

function toApiMessage(msg) {
  return { role: msg.role, content: msg.content };
}

/* ---- localStorage persistence ---- */

function loadMessagesFromStorage() {
  var stored = localStorage.getItem(App.STORAGE_KEYS.messages);
  if (!stored) return;
  try {
    var parsed = JSON.parse(stored);
    var normalized = parsed.map(normalizeMessageRecord).filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant'); });
    App.state.replaceMessages(normalized);
    var maxId = App.state.messages.length > 0 ? Math.max.apply(null, App.state.messages.map(function (m) { return Number.isFinite(m.id) ? m.id : 0; })) : 0;
    App.state.nextId = Math.max(1, maxId + 1);
  } catch (e) {
    App.state.clearMessages();
  }
}

/** Normalize a raw message record from storage/import into the state schema. */
function normalizeMessageRecord(msg) {
  var normalized = sanitizeMessageFields(msg);
  normalized.id = msg.id;
  if (normalized.role === 'assistant') {
    var rawVersions = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions : [normalized];
    normalized.versions = rawVersions.map(App.cloneVersionEntry);
    var candidateIndex = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : normalized.versions.length - 1;
    normalized.currentVersionIndex = Math.min(Math.max(candidateIndex, 0), normalized.versions.length - 1);
    App.applyCurrentVersion(normalized);
  }
  return normalized;
}

function addUserMessage(content) {
  var msg = createMessage('user', content);
  App.state.addMessage(msg);
  return msg;
}

/** Persist messages to localStorage, reusing serializeMessageRecord. */
function persistMessages() {
  var toStore = App.state.messages.map(serializeMessageRecord);
  localStorage.setItem(App.STORAGE_KEYS.messages, JSON.stringify(toStore));
}

App.serializeMessageRecord = serializeMessageRecord;
App.persistMessages = persistMessages;
App.createMessage = createMessage;
App.findMessageById = findMessageById;
App.findMessageIndexById = findMessageIndexById;
App.toApiMessage = toApiMessage;
App.loadMessagesFromStorage = loadMessagesFromStorage;
App.normalizeMessageRecord = normalizeMessageRecord;
App.addUserMessage = addUserMessage;

})();
