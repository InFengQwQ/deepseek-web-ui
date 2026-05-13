/* ================================================================
   api.js — DeepSeek API interaction and streaming
   ================================================================ */

(function() {

var BASE_URL = 'https://api.deepseek.com/beta/chat/completions';

/* ---- API helper functions ---- */

function buildSystemPromptMessage() {
  var prompt = state.config.systemPrompt;
  return typeof prompt === 'string' && prompt.trim() ? { role: 'system', content: prompt } : null;
}

function buildApiContextThroughIndex(endIndex) {
  if (endIndex < 0) return [];
  return state.messages.slice(0, endIndex + 1).map(toApiMessage);
}

function ensureCanStartGeneration(requireApiKey) {
  if (requireApiKey === undefined) requireApiKey = true;
  if (state.isGenerating) return false;
  if (requireApiKey && !state.config.apiKey) return false;
  return true;
}

/* ---- API request builders ---- */

function buildRequestBody(messagesArray, useThinking, options) {
  if (options === undefined) options = {};
  if (options.extra === undefined) options.extra = {};
  var model = options.model || state.config.model;
  var systemPrompt = options.systemPrompt !== undefined ? options.systemPrompt : state.config.systemPrompt;
  var reasoningEffort = options.reasoningEffort || state.config.reasoningEffort;
  var temperature = options.temperature !== undefined ? options.temperature : state.config.temperature;

  var systemMessage = typeof systemPrompt === 'string' && systemPrompt.trim() ? { role: 'system', content: systemPrompt } : null;
  var messages = systemMessage ? [systemMessage].concat(messagesArray) : messagesArray;
  var body = {
    model: model,
    messages: messages,
    max_tokens: CFG.API_MAX_TOKENS,
    stream: true
  };
  if (useThinking) {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = reasoningEffort;
  } else {
    body.thinking = { type: 'disabled' };
    body.temperature = temperature;
  }
  Object.assign(body, options.extra);
  return body;
}

/** Pure fetch + SSE streaming. No DOM or UI state side effects. */
async function streamWithAbort(requestBody, contentCallback, reasoningCallback) {
  var controller = new AbortController();
  state.setAbortController(controller);

  try {
    var resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.config.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error(`API ${resp.status}: ${errText.substring(0, 200)}`);
    }

    var reader = resp.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';

    while (true) {
      var done_value = await reader.read();
      if (done_value.done) break;
      buffer += decoder.decode(done_value.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (var li = 0; li < lines.length; li++) {
        var line = lines[li];
        var trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          var chunk = JSON.parse(trimmed.slice(6));
          var delta = chunk.choices?.[0]?.delta;
          if (delta) {
            if (delta.reasoning_content && reasoningCallback) reasoningCallback(delta.reasoning_content);
            if (delta.content && contentCallback) contentCallback(delta.content);
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(ERR.ABORTED);
    }
    throw err;
  }
}

/* ---- Exports (pure API layer; orchestration lives in generation.js) ---- */

window.buildSystemPromptMessage = buildSystemPromptMessage;
window.buildApiContextThroughIndex = buildApiContextThroughIndex;
window.ensureCanStartGeneration = ensureCanStartGeneration;
window.buildRequestBody = buildRequestBody;
window.streamWithAbort = streamWithAbort;

})();

