/* ================================================================
   dom.js — DOM element references (initialized at bootstrap)

   IDS: single map of element IDs used by index.html.
   Update here first when changing an ID in the HTML.
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

App.DomRefs = {
  chatContainer: null,
  statusSpan: null,
  stopBtn: null,
  scrollToBottomBtn: null,
  apiKeyInput: null,
  modelSelect: null,
  thinkingToggle: null,
  effortSelect: null,
  tempInput: null,
  systemPromptInput: null,
  systemPromptBtn: null,
  systemPromptModal: null,
  systemPromptCloseBtn: null,
  effortField: null,
  tempField: null,
  saveBtn: null,
  clearBtn: null,
  exportBtn: null,
  importBtn: null
};

var DomRefs = App.DomRefs;

/** Get a message DOM element by its data-id. Returns null if not found. */
function getMessageElement(msgId) {
  return DomRefs.chatContainer ? DomRefs.chatContainer.querySelector('.message-item[data-id="' + msgId + '"]') : null;
}

function initDomRefs() {
  DomRefs.chatContainer       = document.getElementById(IDS.chatContainer);
  DomRefs.statusSpan          = document.getElementById(IDS.statusMsg);
  DomRefs.stopBtn             = document.getElementById(IDS.stopGenBtn);
  DomRefs.scrollToBottomBtn   = document.getElementById(IDS.scrollToBottomBtn);
  DomRefs.apiKeyInput         = document.getElementById(IDS.apiKeyInput);
  DomRefs.modelSelect         = document.getElementById(IDS.modelSelect);
  DomRefs.thinkingToggle      = document.getElementById(IDS.thinkingToggle);
  DomRefs.effortSelect        = document.getElementById(IDS.effortSelect);
  DomRefs.tempInput           = document.getElementById(IDS.tempInput);
  DomRefs.systemPromptInput   = document.getElementById(IDS.systemPromptInput);
  DomRefs.systemPromptBtn     = document.getElementById(IDS.systemPromptBtn);
  DomRefs.systemPromptModal   = document.getElementById(IDS.systemPromptModal);
  DomRefs.systemPromptCloseBtn = document.getElementById(IDS.systemPromptCloseBtn);
  DomRefs.effortField         = document.getElementById(IDS.effortField);
  DomRefs.tempField           = document.getElementById(IDS.tempField);
  DomRefs.saveBtn             = document.getElementById(IDS.saveConfigBtn);
  DomRefs.clearBtn            = document.getElementById(IDS.clearHistoryBtn);
  DomRefs.exportBtn           = document.getElementById(IDS.exportBtn);
  DomRefs.importBtn           = document.getElementById(IDS.importBtn);
  return DomRefs;
}

App.initDomRefs = initDomRefs;
App.getMessageElement = getMessageElement;

})();
