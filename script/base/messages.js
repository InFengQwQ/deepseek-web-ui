/* ================================================================
   messages.js — Message creation, query, serialization,
   and localStorage persistence
   ================================================================ */

(function() {

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
  if (msg.role === 'assistant') {
    if (Array.isArray(msg.versions)) record.versions = msg.versions.map(cloneVersionEntry);
    if (Number.isInteger(msg.currentVersionIndex)) record.currentVersionIndex = msg.currentVersionIndex;
  }
  return record;
}

function createMessage(role, content, options) {
  if (content === undefined) content = '';
  if (options === undefined) options = {};
  var fields = sanitizeMessageFields({ role: role, content: content, reasoning_content: options.reasoning_content, createdAt: options.createdAt });
  return {
    id: Number.isFinite(options.id) ? options.id : state.nextId++,
    role: fields.role,
    content: fields.content,
    reasoning_content: fields.reasoning_content,
    createdAt: fields.createdAt,
    _isNew: !!options.isNew
  };
}

function findMessageById(messageId) {
  return state.messages.find(function (m) { return m.id === messageId; }) || null;
}

function findMessageIndexById(messageId) {
  return state.messages.findIndex(function (m) { return m.id === messageId; });
}

function toApiMessage(msg) {
  return { role: msg.role, content: msg.content };
}

/* ---- localStorage persistence ---- */

function persistMessages() {
  var toStore = state.messages.map(function (m) {
    var record = serializeMessageRecord(m);
    record.id = m.id;
    return record;
  });
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(toStore));
}

function loadMessagesFromStorage() {
  var stored = localStorage.getItem(STORAGE_KEYS.messages);
  if (!stored) return;
  try {
    var parsed = JSON.parse(stored);
    var normalized = parsed.map(normalizeMessageRecord).filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant'); });
    state.messages = normalized;
    var maxId = state.messages.length > 0 ? Math.max.apply(null, state.messages.map(function (m) { return Number.isFinite(m.id) ? m.id : 0; })) : 0;
    state.nextId = Math.max(1, maxId + 1);
  } catch (e) {
    localStorage.removeItem(STORAGE_KEYS.messages);
    state.messages = [];
    state.nextId = 1;
  }
}

window.messageCoreFields = messageCoreFields;
window.serializeMessageRecord = serializeMessageRecord;
window.createMessage = createMessage;
window.findMessageById = findMessageById;
window.findMessageIndexById = findMessageIndexById;
window.toApiMessage = toApiMessage;
window.persistMessages = persistMessages;
window.loadMessagesFromStorage = loadMessagesFromStorage;

})();
