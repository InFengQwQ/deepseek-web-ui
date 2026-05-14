/* ================================================================
   constants.js — Storage keys & application constants
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/* ---- Storage keys ---- */
App.STORAGE_KEYS = {
  apiKey: 'ds_api_key',
  model: 'ds_model',
  thinking: 'ds_thinking',
  reasoningEffort: 'ds_reasoning_effort',
  temperature: 'ds_temp',
  systemPrompt: 'ds_system_prompt',
  messages: 'ds_chat_messages'
};

/** Status bar messages */
App.STATUS = {
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
App.UI = {
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
App.CFG = {
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

/** Single source of truth: config property → storage key, default, UI element, uiGet/uiSet. */
/** Iterate every CONFIG_SCHEMA entry with a callback(item). */
App.forEachConfigSchemaItem = function(fn) {
  for (var i = 0; i < App.CONFIG_SCHEMA.length; i++) {
    fn(App.CONFIG_SCHEMA[i]);
  }
};

App.CONFIG_SCHEMA = [
  { prop: 'apiKey',           key: App.STORAGE_KEYS.apiKey,           def: '',                        parse: null,                  elId: 'apiKeyInput' },
  { prop: 'model',            key: App.STORAGE_KEYS.model,            def: 'deepseek-v4-pro',         parse: null,                  elId: 'modelSelect' },
  { prop: 'thinkingEnabled',  key: App.STORAGE_KEYS.thinking,         def: false,                      parse: function(v) { return v === 'true'; },  elId: 'thinkingToggle' },
  { prop: 'reasoningEffort',  key: App.STORAGE_KEYS.reasoningEffort,  def: 'max',                      parse: null,                  elId: 'effortSelect' },
  { prop: 'temperature',      key: App.STORAGE_KEYS.temperature,      def: App.CFG.API_DEFAULT_TEMP,   parse: parseFloat,            elId: 'tempInput' },
  { prop: 'systemPrompt',     key: App.STORAGE_KEYS.systemPrompt,     def: '',                        parse: null,                  elId: 'systemPromptInput' }
];

})();
