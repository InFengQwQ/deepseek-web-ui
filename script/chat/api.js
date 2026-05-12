/* ================================================================
   api.js — DeepSeek API interaction and streaming
   ================================================================ */

var BASE_URL = 'https://api.deepseek.com/beta/chat/completions';

/* ---- API helper functions ---- */

function buildSystemPromptMessage() {
  const prompt = state.config.systemPrompt;
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

function buildRequestBody(messagesArray, useThinking, extra) {
  if (extra === undefined) extra = {};
  const systemMessage = buildSystemPromptMessage();
  const messages = systemMessage ? [systemMessage, ...messagesArray] : messagesArray;
  const body = {
    model: state.config.model,
    messages,
    max_tokens: CONST.API_MAX_TOKENS,
    stream: true,
  };
  if (useThinking) {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = state.config.reasoningEffort;
  } else {
    body.thinking = { type: 'disabled' };
    body.temperature = state.config.temperature;
  }
  Object.assign(body, extra);
  return body;
}

/** Pure fetch + SSE streaming. No DOM or UI state side effects. */
async function streamWithAbort(requestBody, contentCallback, reasoningCallback) {
  const controller = new AbortController();
  state.currentAbortController = controller;

  try {
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.config.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API ${resp.status}: ${errText.substring(0, 200)}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          const chunk = JSON.parse(trimmed.slice(6));
          const delta = chunk.choices?.[0]?.delta;
          if (delta) {
            if (delta.reasoning_content && reasoningCallback) reasoningCallback(delta.reasoning_content);
            if (delta.content && contentCallback) contentCallback(delta.content);
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('用户中止');
    }
    throw err;
  }
}

/** Reset generation state and hide stop button. Pure state cleanup — no DOM update. */
function cleanupGeneration() {
  state.isGenerating = false;
  state.activeGeneratingMessageId = null;
  state.currentAbortController = null;
  setHidden(DomRefs.stopBtn, true);
}

/** Apply a chunk to a specific version of a message, sync if current, update DOM. */
function withMessageVersion(msgId, versionIndex, updater) {
  var msg = findMessageById(msgId);
  if (!msg) return;
  var targetVersion = versionIndex !== null ? getAssistantVersion(msg, versionIndex) : null;
  if (!targetVersion) return;
  updater(msg, targetVersion);
  if (msg.currentVersionIndex === versionIndex) {
    msg.content = targetVersion.content;
    msg.reasoning_content = targetVersion.reasoning_content || null;
  }
  updateSingleMessageDOM(msgId);
}

/** Orchestrate a streaming generation task: UI setup → stream → finalize. */
async function runAssistantTask(requestBody, msgId, loadingText, doneText, options) {
  if (options === undefined) options = {};
  var isPrefix = !!options.isPrefix;
  var originalContent = options.originalContent || '';
  var versionIndex = Number.isInteger(options.versionIndex) ? options.versionIndex : null;

  state.isGenerating = true;
  setHidden(DomRefs.stopBtn, false);
  setStatus(loadingText);
  var fullContent = '';

  try {
    await streamWithAbort(
      requestBody,
      // content callback
      function (chunk) {
        fullContent += chunk;
        withMessageVersion(msgId, versionIndex, function (_msg, ver) {
          ver.content = isPrefix ? originalContent + fullContent : fullContent;
        });
      },
      // reasoning callback (skipped for prefix mode)
      isPrefix ? null : function (chunk) {
        withMessageVersion(msgId, versionIndex, function (_msg, ver) {
          ver.reasoning_content = (ver.reasoning_content || '') + chunk;
        });
      }
    );
    // onComplete
    if (!isPrefix && !fullContent) {
      withMessageVersion(msgId, versionIndex, function (_msg, ver) {
        ver.content = '[空响应]';
      });
    }
    persistMessages();
    updateSingleMessageDOM(msgId);
    setStatus(doneText);
  } catch (err) {
    setStatus('错误: ' + err.message);
    persistMessages();
    updateSingleMessageDOM(msgId);
  } finally {
    cleanupGeneration();
  }
}

function startGeneration(requestBody, msgId, options) {
  if (options === undefined) options = {};
  state.activeGeneratingMessageId = msgId;
  refreshMessageDOM(msgId);
  persistMessages();
  return runAssistantTask(requestBody, msgId, CONST.STATUS_GENERATING, CONST.STATUS_DONE, options);
}


