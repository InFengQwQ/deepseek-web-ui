/* ================================================================
   constants.js — Storage keys & application constants
   ================================================================ */

(function() {

/* ---- Storage keys ---- */
window.STORAGE_KEYS = {
  apiKey: 'ds_api_key',
  model: 'ds_model',
  thinking: 'ds_thinking',
  reasoningEffort: 'ds_reasoning_effort',
  temperature: 'ds_temp',
  systemPrompt: 'ds_system_prompt',
  messages: 'ds_chat_messages'
};

/** Status bar messages */
window.STATUS = {
  IDLE: '就绪',
  GENERATING: '生成中...',
  DONE: '生成完成',
  STOPPED: '生成中止',
  CLEARED: '对话已清空',
  EXPORTED: '对话已导出',
  IMPORTED: '对话已导入',
  INSERTED: '消息已插入',
  MODIFIED: '消息已修改',
  DELETED: '消息已删除',
  SAVED: '配置已保存',
  ERROR_PREFIX: '错误: ',
  IMPORT_ERROR_PREFIX: '导入失败: ',
  BOOTSTRAP_ERROR_PREFIX: '启动失败: '
};

/** Button / UI labels */
window.UI = {
  BTN_SAVE: '保存',
  BTN_CANCEL: '取消',
  BTN_SEND: '发送',
  ACTION_INSERT: '插入',
  ACTION_EDIT: '编辑',
  ACTION_DELETE: '删除',
  ACTION_GENERATE: '生成响应',
  ACTION_PREFIX: '前缀续写',
  ACTION_REGENERATE: '重新生成',
  ROLE_USER: '用户',
  ROLE_ASSISTANT: 'DeepSeek',
  REASONING_TITLE: '思考过程',
  REASONING_COLLAPSED: '(已折叠)',
  REASONING_EXPANDED: '(未折叠)',
  EMPTY_TITLE: '开始新对话',
  EMPTY_PLACEHOLDER: '输入消息…'
};


/** Configuration constants — timers, thresholds, API params, dialogs, export. */
window.CFG = {
  DIALOG_CONFIRM_CLEAR: '清空对话？',
  EXPORT_FILENAME_PREFIX: 'deepseek_chat_',
  EXPORT_EXT: '.json',
  STATUS_TIMEOUT_SHORT: 1500,
  STATUS_TIMEOUT_LONG: 2000,
  API_MAX_TOKENS: 4096,
  API_DEFAULT_TEMP: 0.7,
  SCROLL_BOTTOM_THRESHOLD: 50,
  SCROLL_BTN_THRESHOLD: 100,
  TEXTAREA_MAX_HEIGHT: 168,
  TEXTAREA_MIN_HEIGHT: 36,
  API_BASE_URL: 'https://api.deepseek.com/beta/chat/completions'
};

window.ICONS = {
  insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  generate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  regenerate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
  prefix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
};

/** Single source of truth: config property → storage key, default, UI element, uiGet/uiSet. */
window.CONFIG_SCHEMA = [
  { prop: 'apiKey',           key: STORAGE_KEYS.apiKey,           def: '',                    parse: null,  elId: 'apiKeyInput',        uiGet: function(el) { return el.value.trim(); } },
  { prop: 'model',            key: STORAGE_KEYS.model,            def: 'deepseek-v4-pro',     parse: null,  elId: 'modelSelect' },
  { prop: 'thinkingEnabled',  key: STORAGE_KEYS.thinking,         def: false,                  parse: function(v) { return v === 'true'; },  elId: 'thinkingToggle',  uiGet: function(el) { return el.checked; }, uiSet: function(el, v) { el.checked = v; } },
  { prop: 'reasoningEffort',  key: STORAGE_KEYS.reasoningEffort,  def: 'max',                  parse: null,  elId: 'effortSelect' },
  { prop: 'temperature',      key: STORAGE_KEYS.temperature,      def: CFG.API_DEFAULT_TEMP,   parse: parseFloat,  elId: 'tempInput',          uiGet: function(el) { var v = parseFloat(el.value); return isNaN(v) ? null : v; } },
  { prop: 'systemPrompt',     key: STORAGE_KEYS.systemPrompt,     def: '',                    parse: null,  elId: 'systemPromptInput' }
];

})();
