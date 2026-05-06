let apiKeyInput = null;
let modelSelect = null;
let thinkingToggle = null;
let effortSelect = null;
let tempInput = null;
let effortField = null;
let tempField = null;
let saveBtn = null;
let clearBtn = null;
let exportBtn = null;
let importBtn = null;

function initActions() {
  apiKeyInput = DomRefs.apiKeyInput;
  modelSelect = DomRefs.modelSelect;
  thinkingToggle = DomRefs.thinkingToggle;
  effortSelect = DomRefs.effortSelect;
  tempInput = DomRefs.tempInput;
  effortField = DomRefs.effortField;
  tempField = DomRefs.tempField;
  saveBtn = DomRefs.saveBtn;
  clearBtn = DomRefs.clearBtn;
  exportBtn = DomRefs.exportBtn;
  importBtn = DomRefs.importBtn;
  chatContainer = DomRefs.chatContainer;
  statusSpan = DomRefs.statusSpan;
  stopBtn = DomRefs.stopBtn;
  scrollToBottomBtn = DomRefs.scrollToBottomBtn;

  bindEvents();
}

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('is-hidden', hidden);
}

function setStatus(text, resetAfterMs = 0) {
  statusSpan.innerText = text;
  if (resetAfterMs > 0) {
    setTimeout(() => {
      if (statusSpan.innerText === text) statusSpan.innerText = '就绪';
    }, resetAfterMs);
  }
}

function updateThinkingUI() {
  const enabled = thinkingToggle.checked;
  setThinkingEnabled(enabled);
  setHidden(effortField, !enabled);
  setHidden(tempField, enabled);
  localStorage.setItem(STORAGE_KEYS.thinking, enabled);
}

function syncConfigToUI() {
  apiKeyInput.value = getApiKey();
  modelSelect.value = getModel();
  thinkingToggle.checked = getThinkingEnabled();
  effortSelect.value = getReasoningEffort();
  tempInput.value = getTemperature();
  updateThinkingUI();
}

function saveConfiguration() {
  setApiKey(apiKeyInput.value.trim());
  setModel(modelSelect.value);
  setThinkingEnabled(thinkingToggle.checked);
  setReasoningEffort(effortSelect.value);
  const newTemp = parseFloat(tempInput.value);
  if (!isNaN(newTemp)) setTemperature(newTemp);
  localStorage.setItem(STORAGE_KEYS.apiKey, getApiKey());
  localStorage.setItem(STORAGE_KEYS.model, getModel());
  localStorage.setItem(STORAGE_KEYS.thinking, getThinkingEnabled());
  localStorage.setItem(STORAGE_KEYS.reasoningEffort, getReasoningEffort());
  localStorage.setItem(STORAGE_KEYS.temperature, getTemperature());
  setStatus('配置已保存', 1500);
}

function stopGeneration() {
  if (getCurrentAbortController()) {
    getCurrentAbortController().abort();
    setCurrentAbortController(null);
  }
  setIsGenerating(false);
  setActiveGeneratingMessageId(null);
  setHidden(stopBtn, true);
  setStatus('生成已停止');
  renderMessages();
}

function clearAllMessages() {
  if (confirm('清空所有对话？')) {
    setMessages([]);
    incrementNextId();
    renderMessages();
    persistMessages();
    setStatus('对话已清空');
  }
}

function exportConversation() {
  const data = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    messages: getMessages().map(m => ({
      role: m.role,
      content: m.content,
      reasoning_content: m.reasoning_content || null,
      createdAt: m.createdAt,
      versions: m.role === 'assistant' && Array.isArray(m.versions) ? m.versions.map(cloneVersionEntry) : undefined,
      currentVersionIndex: m.role === 'assistant' && Number.isInteger(m.currentVersionIndex) ? m.currentVersionIndex : undefined
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deepseek_chat_${new Date().toISOString().slice(0,19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('对话已导出', 1500);
}

function importConversation(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      let msgs = imported.messages || imported;
      if (!Array.isArray(msgs)) throw new Error('无效格式');
      const newMsgs = msgs.map(msg => normalizeMessageRecord({
        id: incrementNextId(),
        role: msg.role,
        content: msg.content,
        reasoning_content: msg.reasoning_content || null,
        createdAt: msg.createdAt,
        versions: msg.versions,
        currentVersionIndex: msg.currentVersionIndex
      }));
      if (newMsgs.length === 0) throw new Error('无有效消息');
      setMessages(newMsgs);
      renderMessages();
      persistMessages();
      setStatus(`已导入 ${getMessages().length} 条消息`, 2000);
    } catch (err) {
      setStatus(`导入失败: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function bindEvents() {
  thinkingToggle.addEventListener('change', updateThinkingUI);
  saveBtn.onclick = saveConfiguration;
  clearBtn.onclick = clearAllMessages;
  exportBtn.onclick = exportConversation;
  importBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => { if (e.target.files[0]) importConversation(e.target.files[0]); };
    input.click();
  };
  stopBtn.onclick = stopGeneration;
  chatContainer.addEventListener('scroll', evaluateScrollToBottom);
  scrollToBottomBtn.onclick = () => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };
}
