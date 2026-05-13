/* ================================================================
   messages.js — Message creation, query, serialization, versions,
   and localStorage persistence
   ================================================================ */

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
  return {
    id: Number.isFinite(options.id) ? options.id : state.nextId++,
    role: role,
    content: typeof content === 'string' ? content : '',
    reasoning_content: typeof options.reasoning_content === 'string' ? options.reasoning_content : null,
    createdAt: typeof options.createdAt === 'string' ? options.createdAt : new Date().toISOString(),
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

function normalizeMessageRecord(msg) {
  var normalized = {
    id: msg.id,
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : '',
    reasoning_content: typeof msg.reasoning_content === 'string' ? msg.reasoning_content : null,
    createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date().toISOString()
  };
  if (normalized.role === 'assistant') {
    var rawVersions = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions : [normalized];
    normalized.versions = rawVersions.map(cloneVersionEntry);
    var candidateIndex = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : normalized.versions.length - 1;
    normalized.currentVersionIndex = Math.min(Math.max(candidateIndex, 0), normalized.versions.length - 1);
    applyCurrentVersion(normalized);
  }
  return normalized;
}

/* ---- Assistant version helpers ---- */

function cloneVersionEntry(version) {
  return {
    content: version && typeof version.content === 'string' ? version.content : '',
    reasoning_content: version && typeof version.reasoning_content === 'string' ? version.reasoning_content : null
  };
}

/** Ensure versions array exists, clamp index, sync msg.content/reasoning, return current version. */
function applyCurrentVersion(msg) {
  if (!msg || msg.role !== 'assistant') return null;
  if (!Array.isArray(msg.versions) || msg.versions.length === 0) {
    msg.versions = [cloneVersionEntry(msg)];
  }
  if (!Number.isInteger(msg.currentVersionIndex)) {
    msg.currentVersionIndex = msg.versions.length - 1;
  }
  msg.currentVersionIndex = Math.min(Math.max(msg.currentVersionIndex, 0), msg.versions.length - 1);
  var v = msg.versions[msg.currentVersionIndex];
  msg.content = v.content || '';
  msg.reasoning_content = v.reasoning_content || null;
  return v;
}

function getAssistantVersion(msg, versionIndex) {
  if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.versions) || msg.versions.length === 0) return null;
  var index = Number.isInteger(versionIndex) ? versionIndex : msg.currentVersionIndex;
  if (index < 0 || index >= msg.versions.length) return null;
  return msg.versions[index];
}

/** Append a new empty version and switch to it. Returns the new index. */
function appendAssistantVersion(msg, initialVersion) {
  if (initialVersion === undefined) initialVersion = {};
  if (!msg || msg.role !== 'assistant') return null;
  applyCurrentVersion(msg);
  msg.versions.push(cloneVersionEntry(initialVersion));
  msg.currentVersionIndex = msg.versions.length - 1;
  return applyCurrentVersion(msg) ? msg.currentVersionIndex : null;
}
