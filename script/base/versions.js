/* ================================================================
   versions.js — Assistant message version management
   ================================================================ */

(function() {
var App = window.App = window.App || {};

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

/** Switch assistant message version index, persist, and re-render. */
function setAssistantVersion(msg, versionIndex) {
  if (!msg || msg.role !== 'assistant') return;
  msg.currentVersionIndex = versionIndex;
  applyCurrentVersion(msg);
  App.persistMessages();
  App.refreshMessageDOM(msg.id);
}

/** Mutate a specific version of a message (pure data, no DOM).
 *  If the target version is the current one, syncs content/reasoning to msg root.
 *  Returns true if mutation was applied. */
function mutateVersion(msgId, versionIndex, updater) {
  var msg = App.findMessageById(msgId);
  if (!msg) return false;
  var targetVersion = versionIndex !== null ? getAssistantVersion(msg, versionIndex) : null;
  if (!targetVersion) return false;
  updater(msg, targetVersion);
  if (msg.currentVersionIndex === versionIndex) {
    msg.content = targetVersion.content;
    msg.reasoning_content = targetVersion.reasoning_content || null;
  }
  return true;
}

App.getVersionInfo = getVersionInfo;
App.cloneVersionEntry = cloneVersionEntry;
App.applyCurrentVersion = applyCurrentVersion;
App.getAssistantVersion = getAssistantVersion;
App.appendAssistantVersion = appendAssistantVersion;
App.setAssistantVersion = setAssistantVersion;
App.mutateVersion = mutateVersion;

})();
