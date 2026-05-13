/* ================================================================
   versions.js — Assistant message version management
   ================================================================ */

(function() {

/** Sanitize core message fields with type-safe defaults. */
function sanitizeMessageFields(source) {
  return {
    role: source.role,
    content: typeof source.content === 'string' ? source.content : '',
    reasoning_content: typeof source.reasoning_content === 'string' ? source.reasoning_content : null,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString()
  };
}

/** Extract count & current index from a message's version state. */
function getVersionInfo(msg) {
  var count = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions.length : 1;
  var current = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : count - 1;
  return { count: count, current: current };
}

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
  var info = getVersionInfo(msg);
  msg.currentVersionIndex = Math.min(Math.max(info.current, 0), info.count - 1);
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

/** Normalize a raw message record from storage/import into the state schema. */
function normalizeMessageRecord(msg) {
  var normalized = sanitizeMessageFields(msg);
  normalized.id = msg.id;
  if (normalized.role === 'assistant') {
    var rawVersions = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions : [normalized];
    normalized.versions = rawVersions.map(cloneVersionEntry);
    var candidateIndex = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : normalized.versions.length - 1;
    normalized.currentVersionIndex = Math.min(Math.max(candidateIndex, 0), normalized.versions.length - 1);
    applyCurrentVersion(normalized);
  }
  return normalized;
}

window.sanitizeMessageFields = sanitizeMessageFields;
window.getVersionInfo = getVersionInfo;
window.cloneVersionEntry = cloneVersionEntry;
window.applyCurrentVersion = applyCurrentVersion;
window.getAssistantVersion = getAssistantVersion;
window.appendAssistantVersion = appendAssistantVersion;
window.normalizeMessageRecord = normalizeMessageRecord;

})();
