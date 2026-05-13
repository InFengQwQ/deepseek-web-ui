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
  STOPPED: '生成已停止',
  BLOCKED: '生成中，请等待或先设置API KEY',
  BLOCKED_RETRY: '生成中，请稍后重试',
  CLEARED: '对话已清空',
  EXPORTED: '对话已导出',
  IMPORTED: '已导入 ',
  INSERTED: '消息已插入',
  MODIFIED: '消息已修改',
  DELETED: '消息已删除',
  SAVED: '配置已保存',
  ERROR_PREFIX: '错误: ',
  IMPORT_ERROR_PREFIX: '导入失败: '
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
  REASONING_EXPANDED: '(点击折叠)',
  EMPTY_TITLE: '开始新对话',
  EMPTY_PLACEHOLDER: '输入用户消息…'
};

/** Error / fallback strings */
window.ERR = {
  ABORTED: '用户中止',
  EMPTY_RESPONSE: '[空响应]',
  RENDER_FALLBACK: '[渲染错误] ',
  IMPORT_INVALID: '无效格式',
  IMPORT_EMPTY: '无有效消息'
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
  TEXTAREA_MIN_HEIGHT: 36
};

})();
