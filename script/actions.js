/* ================================================================
   actions.js — UI event handling, modals, import/export
   Depends on: dom.js, utils.js, state.js, api.js, render.js
   ================================================================ */

function initActions() {
  bindEvents();
}

/* ---- System prompt modal ---- */

function scrollSystemPromptToBottom() {
  if (!DomRefs.systemPromptInput) return;
  requestAnimationFrame(function () {
    DomRefs.systemPromptInput.scrollTop = DomRefs.systemPromptInput.scrollHeight;
  });
}

function openSystemPromptModal() {
  if (!DomRefs.systemPromptModal || !DomRefs.systemPromptInput) return;
  DomRefs.systemPromptInput.value = getSystemPrompt();
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

/* ---- Status bar ---- */

function setStatus(text, resetAfterMs) {
  if (resetAfterMs === undefined) resetAfterMs = 0;
  DomRefs.statusSpan.innerText = text;
  if (resetAfterMs > 0) {
    setTimeout(function () {
      if (DomRefs.statusSpan.innerText === text) DomRefs.statusSpan.innerText = '就绪';
    }, resetAfterMs);
  }
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
  DomRefs.apiKeyInput.value = getApiKey();
  DomRefs.modelSelect.value = getModel();
  DomRefs.thinkingToggle.checked = getThinkingEnabled();
  DomRefs.effortSelect.value = getReasoningEffort();
  DomRefs.tempInput.value = getTemperature();
  DomRefs.systemPromptInput.value = getSystemPrompt();
  scrollSystemPromptToBottom();
  updateThinkingUI();
}

function saveConfiguration() {
  setApiKey(DomRefs.apiKeyInput.value.trim());
  setModel(DomRefs.modelSelect.value);
  setThinkingEnabled(DomRefs.thinkingToggle.checked);
  setReasoningEffort(DomRefs.effortSelect.value);
  setSystemPrompt(DomRefs.systemPromptInput.value);
  var newTemp = parseFloat(DomRefs.tempInput.value);
  if (!isNaN(newTemp)) setTemperature(newTemp);
  localStorage.setItem(STORAGE_KEYS.apiKey, getApiKey());
  localStorage.setItem(STORAGE_KEYS.model, getModel());
  localStorage.setItem(STORAGE_KEYS.thinking, getThinkingEnabled());
  localStorage.setItem(STORAGE_KEYS.reasoningEffort, getReasoningEffort());
  localStorage.setItem(STORAGE_KEYS.systemPrompt, getSystemPrompt());
  localStorage.setItem(STORAGE_KEYS.temperature, getTemperature());
  closeSystemPromptModal();
  setStatus('配置已保存', 1500);
}

/* ---- Stop generation ---- */

function stopGeneration() {
  if (getCurrentAbortController()) {
    getCurrentAbortController().abort();
    setCurrentAbortController(null);
  }
  setIsGenerating(false);
  setActiveGeneratingMessageId(null);
  setHidden(DomRefs.stopBtn, true);
  setStatus('生成已停止');
  renderMessages();
}

/* ---- Clear all messages ---- */

function clearAllMessages() {
  if (confirm('清空对话？')) {
    setMessages([]);
    resetNextId();
    renderMessages();
    persistMessages();
    setStatus('对话已清空');
  }
}

/* ---- Export / Import ---- */

function exportConversation() {
  var data = getMessages().map(function (m) {
    return {
      role: m.role,
      content: m.content,
      reasoning_content: m.reasoning_content || null,
      createdAt: m.createdAt,
      versions: m.role === 'assistant' && Array.isArray(m.versions) ? m.versions.map(cloneVersionEntry) : undefined,
      currentVersionIndex: m.role === 'assistant' && Number.isInteger(m.currentVersionIndex) ? m.currentVersionIndex : undefined
    };
  });
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
          id: incrementNextId(),
          role: msg.role,
          content: msg.content,
          reasoning_content: msg.reasoning_content || null,
          createdAt: msg.createdAt,
          versions: msg.versions,
          currentVersionIndex: msg.currentVersionIndex
        });
      });
      if (newMsgs.length === 0) throw new Error('无有效消息');
      setMessages(newMsgs);
      renderMessages();
      persistMessages();
      setStatus('已导入 ' + getMessages().length + ' 条消息', 2000);
    } catch (err) {
      setStatus('导入失败: ' + err.message);
    }
  };
  reader.readAsText(file);
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
  DomRefs.chatContainer.addEventListener('scroll', evaluateScrollToBottom);
  DomRefs.scrollToBottomBtn.onclick = function () {
    DomRefs.chatContainer.scrollTop = DomRefs.chatContainer.scrollHeight;
  };
}
