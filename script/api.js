const BASE_URL = 'https://api.deepseek.com/beta/chat/completions';

function buildRequestBody(messagesArray, useThinking, extra = {}) {
  const systemMessage = buildSystemPromptMessage();
  const messages = systemMessage ? [systemMessage, ...messagesArray] : messagesArray;
  const body = {
    model: getModel(),
    messages,
    max_tokens: 4096,
    stream: true,
  };
  if (useThinking) {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = getReasoningEffort();
  } else {
    body.thinking = { type: 'disabled' };
    body.temperature = getTemperature();
  }
  Object.assign(body, extra);
  return body;
}

async function streamWithAbort(requestBody, contentCallback, reasoningCallback, onComplete, onError) {
  const controller = new AbortController();
  setCurrentAbortController(controller);
  setHidden(stopBtn, false);
  setIsGenerating(true);
  renderMessages();

  try {
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`
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
  setIsGenerating(false);
  setActiveGeneratingMessageId(null);
  setCurrentAbortController(null);
  setHidden(stopBtn, true);
  renderMessages();
}

async function runAssistantTask(requestBody, msgId, loadingText, doneText, options = {}) {
  const isPrefix = !!options.isPrefix;
  const originalContent = options.originalContent || '';
  const versionIndex = Number.isInteger(options.versionIndex) ? options.versionIndex : null;
  setStatus(loadingText);
  let fullContent = '';
  await streamWithAbort(
    requestBody,
    (chunk) => {
      fullContent += chunk;
      const msg = findMessageById(msgId);
      if (msg) {
        const targetVersion = getAssistantVersion(msg, versionIndex);
        if (targetVersion) {
          targetVersion.content = isPrefix ? originalContent + fullContent : fullContent;
          if (msg.currentVersionIndex === versionIndex) {
            msg.content = targetVersion.content;
            msg.reasoning_content = targetVersion.reasoning_content || null;
          }
        }
        updateSingleMessageDOM(msgId);
      }
    },
    isPrefix ? null : (chunk) => {
      const msg = findMessageById(msgId);
      if (msg) {
        const targetVersion = getAssistantVersion(msg, versionIndex);
        if (targetVersion) {
          targetVersion.reasoning_content = (targetVersion.reasoning_content || '') + chunk;
          if (msg.currentVersionIndex === versionIndex) {
            msg.reasoning_content = targetVersion.reasoning_content;
          }
        }
        updateSingleMessageDOM(msgId);
      }
    },
    () => {
      const msg = findMessageById(msgId);
      if (msg) {
        const targetVersion = getAssistantVersion(msg, versionIndex);
        if (targetVersion && !isPrefix && !fullContent) {
          targetVersion.content = '[空响应]';
          if (msg.currentVersionIndex === versionIndex) {
            msg.content = targetVersion.content;
          }
        }
      }
      persistMessages();
      renderMessages();
      setStatus(doneText);
    },
    (err) => {
      setStatus(`错误: ${err.message}`);
      persistMessages();
      renderMessages();
    }
  );
}

function startGeneration(requestBody, msgId, options = {}) {
  setActiveGeneratingMessageId(msgId);
  renderMessages();
  persistMessages();
  return runAssistantTask(requestBody, msgId, '生成中...', '生成完成', options);
}

async function generateNewResponse(afterMsgId) {
  if (!ensureCanStartGeneration(true)) return;
  const idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  const context = buildApiContextThroughIndex(idx);
  const requestBody = buildRequestBody(context, getThinkingEnabled());

  const tempMessage = createMessage('assistant', '', { reasoning_content: '' });
  setMessages([...getMessages().slice(0, idx + 1), tempMessage, ...getMessages().slice(idx + 1)]);
  ensureAssistantVersion(tempMessage);

  await startGeneration(requestBody, tempMessage.id, { versionIndex: 0 });
}

async function prefixCompletion(assistantId) {
  if (!ensureCanStartGeneration(true)) return;
  const targetIdx = findMessageIndexById(assistantId);
  if (targetIdx === -1) return;
  const targetMsg = findMessageById(assistantId);
  if (!targetMsg || targetMsg.role !== 'assistant') return;
  const historyBefore = getMessages().slice(0, targetIdx);
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
  if (idx === -1 || getMessages()[idx].role !== 'assistant') return;
  const historyBefore = getMessages().slice(0, idx);
  const targetMsg = getMessages()[idx];
  const versionIndex = appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  const requestBody = buildRequestBody(historyBefore.map(toApiMessage), getThinkingEnabled());
  await startGeneration(requestBody, assistantId, { versionIndex });
}
