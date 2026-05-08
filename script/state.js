let messages = [];
let nextId = 1;
let isGenerating = false;
let activeGeneratingMessageId = null;
let currentAbortController = null;

const STORAGE_KEYS = {
  apiKey: 'ds_api_key',
  model: 'ds_model',
  thinking: 'ds_thinking',
  reasoningEffort: 'ds_reasoning_effort',
  temperature: 'ds_temp',
  systemPrompt: 'ds_system_prompt',
  messages: 'ds_chat_messages'
};
const STATUS_IDLE = '就绪';

let apiKey = localStorage.getItem(STORAGE_KEYS.apiKey) || '';
let model = localStorage.getItem(STORAGE_KEYS.model) || 'deepseek-v4-pro';
let thinkingEnabled = localStorage.getItem(STORAGE_KEYS.thinking) === 'true';
let reasoningEffort = localStorage.getItem(STORAGE_KEYS.reasoningEffort) || 'max';
let temperature = parseFloat(localStorage.getItem(STORAGE_KEYS.temperature) || '0.7');
let systemPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt) || '';

function getMessages() {
  return messages;
}

function setMessages(newMessages) {
  messages = newMessages;
}

function getNextId() {
  return nextId;
}

function incrementNextId() {
  return nextId++;
}

function getIsGenerating() {
  return isGenerating;
}

function setIsGenerating(value) {
  isGenerating = value;
}

function getActiveGeneratingMessageId() {
  return activeGeneratingMessageId;
}

function setActiveGeneratingMessageId(id) {
  activeGeneratingMessageId = id;
}

function getCurrentAbortController() {
  return currentAbortController;
}

function setCurrentAbortController(controller) {
  currentAbortController = controller;
}

function getApiKey() {
  return apiKey;
}

function setApiKey(key) {
  apiKey = key;
}

function getModel() {
  return model;
}

function setModel(m) {
  model = m;
}

function getThinkingEnabled() {
  return thinkingEnabled;
}

function setThinkingEnabled(enabled) {
  thinkingEnabled = enabled;
}

function getReasoningEffort() {
  return reasoningEffort;
}

function setReasoningEffort(effort) {
  reasoningEffort = effort;
}

function getTemperature() {
  return temperature;
}

function setTemperature(temp) {
  temperature = temp;
}

function getSystemPrompt() {
  return systemPrompt;
}

function setSystemPrompt(prompt) {
  systemPrompt = prompt;
}

function createMessage(role, content = '', options = {}) {
  return {
    id: Number.isFinite(options.id) ? options.id : nextId++,
    role,
    content: typeof content === 'string' ? content : '',
    reasoning_content: typeof options.reasoning_content === 'string' ? options.reasoning_content : null,
    createdAt: typeof options.createdAt === 'string' ? options.createdAt : new Date().toISOString(),
    _isNew: !!options.isNew
  };
}

function findMessageById(messageId) {
  return messages.find(m => m.id === messageId) || null;
}

function findMessageIndexById(messageId) {
  return messages.findIndex(m => m.id === messageId);
}

function toApiMessage(msg) {
  return { role: msg.role, content: msg.content };
}

function buildSystemPromptMessage() {
  const prompt = getSystemPrompt();
  return typeof prompt === 'string' && prompt.trim() ? { role: 'system', content: prompt } : null;
}

function buildApiContextThroughIndex(endIndex) {
  if (endIndex < 0) return [];
  return messages.slice(0, endIndex + 1).map(toApiMessage);
}

function ensureCanStartGeneration(requireApiKey = true) {
  if (isGenerating) {
    return false;
  }
  if (requireApiKey && !apiKey) {
    return false;
  }
  return true;
}

function persistMessages() {
  const toStore = messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning_content: m.reasoning_content || null,
    createdAt: m.createdAt,
    versions: m.role === 'assistant' && Array.isArray(m.versions) ? m.versions.map(cloneVersionEntry) : undefined,
    currentVersionIndex: m.role === 'assistant' && Number.isInteger(m.currentVersionIndex) ? m.currentVersionIndex : undefined
  }));
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(toStore));
}

function loadMessagesFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEYS.messages);
  if (!stored) return;
  const parsed = JSON.parse(stored);
  const normalized = parsed.map(normalizeMessageRecord).filter(m => m && (m.role === 'user' || m.role === 'assistant'));
  messages = normalized;
  const maxId = messages.length > 0 ? Math.max(...messages.map(m => (Number.isFinite(m.id) ? m.id : 0))) : 0;
  nextId = Math.max(1, maxId + 1);
}

function formatMessageTime(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createReasoningHeader(initialCollapsed = false) {
  const header = document.createElement('div');
  header.className = 'reasoning-header';

  const title = document.createElement('span');
  title.innerText = '思考过程';

  const state = document.createElement('span');
  state.className = 'reasoning-header-state';
  state.innerText = initialCollapsed ? '(已折叠)' : '(点击折叠)';

  header.appendChild(title);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(state);

  return { header, state };
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdownToHTML(text) {
  const source = text || '';
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    const rawHtml = marked.parse(source, { breaks: true, gfm: true });
    return DOMPurify.sanitize(rawHtml);
  }
  return `<p>${escapeHtml(source).replace(/\n/g, '<br>')}</p>`;
}

const ICONS = {
  insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  generate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  regenerate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
  prefix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
};
function cloneVersionEntry(version) {
  return {
    content: version && typeof version.content === 'string' ? version.content : '',
    reasoning_content: version && typeof version.reasoning_content === 'string' ? version.reasoning_content : null
  };
}

function syncAssistantMessageToCurrentVersion(msg) {
  if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.versions) || msg.versions.length === 0) return;
  const index = Math.min(
    Math.max(Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : msg.versions.length - 1, 0),
    msg.versions.length - 1
  );
  const currentVersion = msg.versions[index];
  msg.currentVersionIndex = index;
  msg.content = currentVersion.content || '';
  msg.reasoning_content = currentVersion.reasoning_content || null;
}

function normalizeMessageRecord(msg) {
  const normalized = {
    id: msg.id,
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : '',
    reasoning_content: typeof msg.reasoning_content === 'string' ? msg.reasoning_content : null,
    createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date().toISOString()
  };

  if (normalized.role === 'assistant') {
    const rawVersions = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions : [normalized];
    normalized.versions = rawVersions.map(cloneVersionEntry);
    const candidateIndex = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : normalized.versions.length - 1;
    normalized.currentVersionIndex = Math.min(Math.max(candidateIndex, 0), normalized.versions.length - 1);
    syncAssistantMessageToCurrentVersion(normalized);
  }

  return normalized;
}

function getAssistantVersion(msg, versionIndex = msg?.currentVersionIndex) {
  if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.versions) || msg.versions.length === 0) return null;
  const index = Number.isInteger(versionIndex) ? versionIndex : msg.currentVersionIndex;
  if (index < 0 || index >= msg.versions.length) return null;
  return msg.versions[index];
}

function ensureAssistantVersion(msg) {
  if (!msg || msg.role !== 'assistant') return null;
  if (!Array.isArray(msg.versions) || msg.versions.length === 0) {
    msg.versions = [cloneVersionEntry(msg)];
  }
  if (!Number.isInteger(msg.currentVersionIndex)) {
    msg.currentVersionIndex = msg.versions.length - 1;
  }
  syncAssistantMessageToCurrentVersion(msg);
  return msg.versions[msg.currentVersionIndex];
}

function appendAssistantVersion(msg, initialVersion = {}) {
  if (!msg || msg.role !== 'assistant') return null;
  ensureAssistantVersion(msg);
  msg.versions.push(cloneVersionEntry(initialVersion));
  msg.currentVersionIndex = msg.versions.length - 1;
  syncAssistantMessageToCurrentVersion(msg);
  return msg.currentVersionIndex;
}

function setAssistantVersion(msg, versionIndex) {
  if (!msg || msg.role !== 'assistant') return;
  ensureAssistantVersion(msg);
  msg.currentVersionIndex = Math.min(Math.max(versionIndex, 0), msg.versions.length - 1);
  syncAssistantMessageToCurrentVersion(msg);
  persistMessages();
  renderMessages();
}
