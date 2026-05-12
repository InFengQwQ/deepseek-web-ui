/* ================================================================
   actions.js — UI event handling, modals, import/export
   ================================================================ */

/* ---- System prompt modal ---- */

function scrollSystemPromptToBottom() {
  if (!DomRefs.systemPromptInput) return;
  requestAnimationFrame(function () {
    DomRefs.systemPromptInput.scrollTop = DomRefs.systemPromptInput.scrollHeight;
  });
}

function openSystemPromptModal() {
  if (!DomRefs.systemPromptModal || !DomRefs.systemPromptInput) return;
  DomRefs.systemPromptInput.value = state.config.systemPrompt;
  setHidden(DomRefs.systemPromptModal, false);
  DomRefs.systemPromptModal.setAttribute('aria-hidden', 'false');
  DomRefs.systemPromptInput.focus();
  scrollSystemPromptToBottom();
}

function closeSystemPromptModal() {
  if (!DomRefs.systemPromptModal) return;
  setHidden(DomRefs.systemPromptModal, true);
  DomRefs.systemPromptModal.setAttribute('aria-hidden', 'true');
}

/* ---- Thinking / temperature UI toggle ---- */

function updateThinkingUI() {
  if (!DomRefs.thinkingToggle) return;
  var enabled = DomRefs.thinkingToggle.checked;
  setHidden(DomRefs.effortField, !enabled);
  setHidden(DomRefs.tempField, enabled);
}

/* ---- Config sync & save ---- */

function syncConfigToUI() {
  DomRefs.apiKeyInput.value = state.config.apiKey;
  DomRefs.modelSelect.value = state.config.model;
  DomRefs.thinkingToggle.checked = state.config.thinkingEnabled;
  DomRefs.effortSelect.value = state.config.reasoningEffort;
  DomRefs.tempInput.value = state.config.temperature;
  DomRefs.systemPromptInput.value = state.config.systemPrompt;
  scrollSystemPromptToBottom();
  updateThinkingUI();
}

function saveConfiguration() {
  state.config.apiKey = DomRefs.apiKeyInput.value.trim();
  state.config.model = DomRefs.modelSelect.value;
  state.config.thinkingEnabled = DomRefs.thinkingToggle.checked;
  state.config.reasoningEffort = DomRefs.effortSelect.value;
  state.config.systemPrompt = DomRefs.systemPromptInput.value;
  var newTemp = parseFloat(DomRefs.tempInput.value);
  if (!isNaN(newTemp)) state.config.temperature = newTemp;
  persistConfig();
  closeSystemPromptModal();
  setStatus('配置已保存', 1500);
}

/* ---- Stop generation ---- */

function stopGeneration() {
  if (state.currentAbortController) {
    state.currentAbortController.abort();
    state.currentAbortController = null;
  }
  state.isGenerating = false;
  state.activeGeneratingMessageId = null;
  setHidden(DomRefs.stopBtn, true);
  setStatus('生成已停止');
  renderMessages();
}

/* ---- Clear all messages ---- */

function clearAllMessages() {
  if (confirm('清空对话？')) {
    state.messages = [];
    state.nextId = 1;
    renderMessages();
    persistMessages();
    setStatus('对话已清空');
  }
}

/* ---- Export / Import ---- */

function exportConversation() {
  var data = state.messages.map(serializeMessageRecord);
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'deepseek_chat_' + new Date().toISOString().slice(0, 19) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  setStatus('对话已导出', 1500);
}

function importConversation(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var imported = JSON.parse(e.target.result);
      var msgs = imported.messages || imported;
      if (!Array.isArray(msgs)) throw new Error('无效格式');
      var newMsgs = msgs.map(function (msg) {
        return normalizeMessageRecord({
          id: state.nextId++,
          role: msg.role,
          content: msg.content,
          reasoning_content: msg.reasoning_content || null,
          createdAt: msg.createdAt,
          versions: msg.versions,
          currentVersionIndex: msg.currentVersionIndex
        });
      });
      if (newMsgs.length === 0) throw new Error('无有效消息');
      state.messages = newMsgs;
      renderMessages();
      persistMessages();
      setStatus('已导入 ' + state.messages.length + ' 条消息', 2000);
    } catch (err) {
      setStatus('导入失败: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ---- Message CRUD ---- */

function insertUserMessageAfter(afterMsgId) {
  var idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var newMsg = createMessage('user', '', { isNew: true });
  var newMessages = state.messages.slice();
  newMessages.splice(idx + 1, 0, newMsg);
  state.messages = newMessages;
  renderMessages();
  persistMessages();
}

function editMessage(msgId, contentDiv, actionsDiv, isNew) {
  var msg = findMessageById(msgId);
  if (!msg) return;
  if (contentDiv.querySelector('textarea')) return;

  var textarea = document.createElement('textarea');
  textarea.className = 'compact-textarea message-edit-textarea';
  textarea.value = msg.content;

  var saveBtn = document.createElement('button');
  saveBtn.className = 'small primary message-edit-save';
  saveBtn.innerText = '保存';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'small';
  cancelBtn.innerText = '取消';

  var editActions = document.createElement('div');
  editActions.className = 'message-edit-actions';
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);
  contentDiv.appendChild(editActions);

  autoResizeTextarea(textarea);

  if (actionsDiv) actionsDiv.style.opacity = '0';
  textarea.focus();

  saveBtn.onclick = function () {
    var newContent = textarea.value;
    if (msg.role === 'assistant') {
      var version = applyCurrentVersion(msg);
      if (version) {
        version.content = newContent;
        version.reasoning_content = msg.reasoning_content || null;
        applyCurrentVersion(msg);
      }
    } else {
      msg.content = newContent;
    }
    persistMessages();
    setStatus(isNew ? '消息已插入' : '消息已修改', 1500);
    renderMessages();
  };

  cancelBtn.onclick = function () {
    if (isNew) {
      deleteMessage(msg.id);
    } else {
      renderMessages();
    }
  };
}

function deleteMessage(msgId) {
  var idx = findMessageIndexById(msgId);
  if (idx !== -1) {
    state.messages = state.messages.slice(0, idx).concat(state.messages.slice(idx + 1));
    renderMessages();
    persistMessages();
    setStatus('消息已删除');
  }
}

/* ---- Assistant version navigation (moved from state.js) ---- */

function setAssistantVersion(msg, versionIndex) {
  if (!msg || msg.role !== 'assistant') return;
  msg.currentVersionIndex = versionIndex;
  applyCurrentVersion(msg);
  persistMessages();
  renderMessages();
}

/* ---- Event binding ---- */

function bindEvents() {
  DomRefs.thinkingToggle.addEventListener('change', updateThinkingUI);
  DomRefs.systemPromptInput.addEventListener('input', scrollSystemPromptToBottom);
  DomRefs.systemPromptBtn.onclick = openSystemPromptModal;
  DomRefs.systemPromptCloseBtn.onclick = closeSystemPromptModal;
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !DomRefs.systemPromptModal.classList.contains('is-hidden')) {
      closeSystemPromptModal();
    }
  });
  DomRefs.saveBtn.onclick = saveConfiguration;
  DomRefs.clearBtn.onclick = clearAllMessages;
  DomRefs.exportBtn.onclick = exportConversation;
  DomRefs.importBtn.onclick = function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) { if (e.target.files[0]) importConversation(e.target.files[0]); };
    input.click();
  };
  DomRefs.stopBtn.onclick = stopGeneration;
  var scrollTicking = false;
  DomRefs.chatContainer.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        evaluateScrollToBottom();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });
  DomRefs.scrollToBottomBtn.onclick = function () {
    DomRefs.chatContainer.scrollTop = DomRefs.chatContainer.scrollHeight;
  };
}

function initActions() {
  bindEvents();
}

/** Bootstrap the application: init DOM, load state, wire events, render. */
function bootstrapApp() {
  initDomRefs();
  loadMessagesFromStorage();
  initActions();
  syncConfigToUI();
  renderMessages();
}

// Auto-bootstrap when DOM is ready (script loads with defer)
bootstrapApp();
