/* ================================================================
   dom.js — DOM element references (initialized at bootstrap)

   IDS: single map of element IDs used by index.html.
   Update here first when changing an ID in the HTML.
   Keys are used directly as DomRefs property names.
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/** Centralized ID map — change an ID here and it propagates everywhere. */
var IDS = {
  chatContainer: 'chatContainer',
  statusMsg: 'statusMsg',
  stopGenBtn: 'stopGenBtn',
  scrollToBottomBtn: 'scrollToBottomBtn',
  apiKeyInput: 'apiKeyInput',
  modelSelect: 'modelSelect',
  thinkingToggle: 'thinkingToggle',
  effortSelect: 'effortSelect',
  tempInput: 'tempInput',
  systemPromptInput: 'systemPromptInput',
  systemPromptBtn: 'systemPromptBtn',
  systemPromptModal: 'systemPromptModal',
  systemPromptCloseBtn: 'systemPromptCloseBtn',
  effortField: 'effortField',
  tempField: 'tempField',
  saveConfigBtn: 'saveConfigBtn',
  clearHistoryBtn: 'clearHistoryBtn',
  exportBtn: 'exportBtn',
  importBtn: 'importBtn'
};

App.DomRefs = {};

var DomRefs = App.DomRefs;

/** Get a message DOM element by its data-id. Returns null if not found. */
function getMessageElement(msgId) {
  return DomRefs.chatContainer ? DomRefs.chatContainer.querySelector('.message-item[data-id="' + msgId + '"]') : null;
}

/** Auto-populate DomRefs from the IDS map. Add new IDs to IDS only. */
function initDomRefs() {
  var keys = Object.keys(IDS);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    DomRefs[key] = document.getElementById(IDS[key]);
  }
  return DomRefs;
}

App.initDomRefs = initDomRefs;
App.getMessageElement = getMessageElement;

})();
