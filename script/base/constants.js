/* ================================================================
   constants.js — Storage keys & application constants
   ================================================================ */

/* ---- Storage keys ---- */
var STORAGE_KEYS = {
  apiKey: 'ds_api_key',
  model: 'ds_model',
  thinking: 'ds_thinking',
  reasoningEffort: 'ds_reasoning_effort',
  temperature: 'ds_temp',
  systemPrompt: 'ds_system_prompt',
  messages: 'ds_chat_messages'
};

/** Shared application constants — single source of truth for magic numbers/strings. */
var CONST = {
  /* Status bar messages */
  STATUS_IDLE: '就绪',
  STATUS_GENERATING: '生成中...',
  STATUS_DONE: '生成完成',
  STATUS_STOPPED: '生成已停止',
  STATUS_BLOCKED: '生成中，请等待或先设置API KEY',
  STATUS_BLOCKED_RETRY: '生成中，请稍后重试',
  STATUS_CLEARED: '对话已清空',
  STATUS_EXPORTED: '对话已导出',
  STATUS_IMPORTED: '已导入 ',
  STATUS_INSERTED: '消息已插入',
  STATUS_MODIFIED: '消息已修改',
  STATUS_DELETED: '消息已删除',
  STATUS_SAVED: '配置已保存',
  STATUS_ERROR_PREFIX: '错误: ',
  STATUS_IMPORT_ERROR_PREFIX: '导入失败: ',
  /* Button / UI labels */
  UI_BTN_SAVE: '保存',
  UI_BTN_CANCEL: '取消',
  UI_BTN_SEND: '发送',
  UI_ACTION_INSERT: '插入',
  UI_ACTION_EDIT: '编辑',
  UI_ACTION_DELETE: '删除',
  UI_ACTION_GENERATE: '生成响应',
  UI_ACTION_PREFIX: '前缀续写',
  UI_ACTION_REGENERATE: '重新生成',
  UI_ROLE_USER: '用户',
  UI_ROLE_ASSISTANT: 'DeepSeek',
  UI_REASONING_TITLE: '思考过程',
  UI_REASONING_COLLAPSED: '(已折叠)',
  UI_REASONING_EXPANDED: '(点击折叠)',
  UI_EMPTY_TITLE: '开始新对话',
  UI_EMPTY_PLACEHOLDER: '输入用户消息…',
  /* Error / fallback strings */
  ERR_ABORTED: '用户中止',
  ERR_EMPTY_RESPONSE: '[空响应]',
  ERR_RENDER_FALLBACK: '[渲染错误] ',
  ERR_IMPORT_INVALID: '无效格式',
  ERR_IMPORT_EMPTY: '无有效消息',
  /* Dialogs */
  DIALOG_CONFIRM_CLEAR: '清空对话？',
  /* Export */
  EXPORT_FILENAME_PREFIX: 'deepseek_chat_',
  EXPORT_EXT: '.json',
  /* Timers & thresholds */
  STATUS_TIMEOUT_SHORT: 1500,
  STATUS_TIMEOUT_LONG: 2000,
  API_MAX_TOKENS: 4096,
  API_DEFAULT_TEMP: 0.7,
  SCROLL_BOTTOM_THRESHOLD: 50,
  SCROLL_BTN_THRESHOLD: 100,
  TEXTAREA_MAX_HEIGHT: 168,
  TEXTAREA_MIN_HEIGHT: 36
};
