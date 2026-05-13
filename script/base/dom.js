/* ================================================================
   dom.js — DOM element references (initialized at bootstrap)
   ================================================================ */

(function() {

window.DomRefs = {
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

function initDomRefs() {
  DomRefs.chatContainer = document.getElementById('chatContainer');
  DomRefs.statusSpan = document.getElementById('statusMsg');
  DomRefs.stopBtn = document.getElementById('stopGenBtn');
  DomRefs.scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
  DomRefs.apiKeyInput = document.getElementById('apiKeyInput');
  DomRefs.modelSelect = document.getElementById('modelSelect');
  DomRefs.thinkingToggle = document.getElementById('thinkingToggle');
  DomRefs.effortSelect = document.getElementById('effortSelect');
  DomRefs.tempInput = document.getElementById('tempInput');
  DomRefs.systemPromptInput = document.getElementById('systemPromptInput');
  DomRefs.systemPromptBtn = document.getElementById('systemPromptBtn');
  DomRefs.systemPromptModal = document.getElementById('systemPromptModal');
  DomRefs.systemPromptCloseBtn = document.getElementById('systemPromptCloseBtn');
  DomRefs.effortField = document.getElementById('effortField');
  DomRefs.tempField = document.getElementById('tempField');
  DomRefs.saveBtn = document.getElementById('saveConfigBtn');
  DomRefs.clearBtn = document.getElementById('clearHistoryBtn');
  DomRefs.exportBtn = document.getElementById('exportBtn');
  DomRefs.importBtn = document.getElementById('importBtn');
  return DomRefs;
}

window.initDomRefs = initDomRefs;

})();
