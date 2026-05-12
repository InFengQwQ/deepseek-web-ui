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
    max_tokens: 4096,
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

async function streamWithAbort(requestBody, contentCallback, reasoningCallback, onComplete, onError) {
  const controller = new AbortController();
  state.currentAbortController = controller;
  setHidden(DomRefs.stopBtn, false);
  state.isGenerating = true;

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
    onComplete();
  } catch (err) {
    if (err.name === 'AbortError') {
      onError(new Error('用户中止'));
    } else {
      onError(err);
    }
  } finally {
    cleanupGeneration();
  }
}

function cleanupGeneration() {
  const finishedMsgId = state.activeGeneratingMessageId;
  state.isGenerating = false;
  state.activeGeneratingMessageId = null;
  state.currentAbortController = null;
  setHidden(DomRefs.stopBtn, true);
  // Incremental update only — avoid full renderMessages() re-render
  if (finishedMsgId !== null) {
    updateSingleMessageDOM(finishedMsgId);
  }
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

async function runAssistantTask(requestBody, msgId, loadingText, doneText, options) {
  if (options === undefined) options = {};
  var isPrefix = !!options.isPrefix;
  var originalContent = options.originalContent || '';
  var versionIndex = Number.isInteger(options.versionIndex) ? options.versionIndex : null;
  setStatus(loadingText);
  var fullContent = '';

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
    },
    // onComplete
    function () {
      if (!isPrefix && !fullContent) {
        withMessageVersion(msgId, versionIndex, function (_msg, ver) {
          ver.content = '[空响应]';
        });
      }
      persistMessages();
      updateSingleMessageDOM(msgId);
      setStatus(doneText);
    },
    // onError
    function (err) {
      setStatus('错误: ' + err.message);
      persistMessages();
      updateSingleMessageDOM(msgId);
    }
  );
}

function startGeneration(requestBody, msgId, options) {
  if (options === undefined) options = {};
  state.activeGeneratingMessageId = msgId;
  renderMessages();
  persistMessages();
  return runAssistantTask(requestBody, msgId, '生成中...', '生成完成', options);
}

async function generateNewResponse(afterMsgId) {
  if (!ensureCanStartGeneration(true)) return;
  const idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  const context = buildApiContextThroughIndex(idx);
  const requestBody = buildRequestBody(context, state.config.thinkingEnabled);

  const tempMessage = createMessage('assistant', '', { reasoning_content: '' });
  state.messages = [...state.messages.slice(0, idx + 1), tempMessage, ...state.messages.slice(idx + 1)];
  applyCurrentVersion(tempMessage);

  await startGeneration(requestBody, tempMessage.id, { versionIndex: 0 });
}

async function prefixCompletion(assistantId) {
  if (!ensureCanStartGeneration(true)) return;
  const targetIdx = findMessageIndexById(assistantId);
  if (targetIdx === -1) return;
  const targetMsg = findMessageById(assistantId);
  if (!targetMsg || targetMsg.role !== 'assistant') return;
  const historyBefore = state.messages.slice(0, targetIdx);
  const apiMessages = [
    ...historyBefore.map(toApiMessage),
    { role: 'assistant', content: targetMsg.content, prefix: true }
  ];
  
  await startGeneration(buildRequestBody(apiMessages, false), assistantId, {
    isPrefix: true,
    originalContent: targetMsg.content,
    versionIndex: targetMsg.currentVersionIndex
  });
}

async function regenerateAssistant(assistantId) {
  if (!ensureCanStartGeneration(false)) return;
  const idx = findMessageIndexById(assistantId);
  if (idx === -1 || state.messages[idx].role !== 'assistant') return;
  const historyBefore = state.messages.slice(0, idx);
  const targetMsg = state.messages[idx];
  const versionIndex = appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  const requestBody = buildRequestBody(historyBefore.map(toApiMessage), state.config.thinkingEnabled);
  await startGeneration(requestBody, assistantId, { versionIndex });
}


