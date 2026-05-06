// API module: handles network requests to DeepSeek API

const BETA_URL = 'https://api.deepseek.com/beta/chat/completions';

function buildRequestBody(messagesArray, useThinking, extra = {}) {
  const body = {
    model: getModel(),
    messages: messagesArray,
    max_tokens: 4096,
    stream: true,
  };
  if (useThinking) {
    body.extra_body = { thinking: { type: "enabled", reasoning_effort: getReasoningEffort() } };
  } else {
    body.extra_body = { thinking: { type: "disabled" } };
    body.temperature = getTemperature();
  }
  Object.assign(body, extra);
  return body;
}

async function streamWithAbort(requestBody, contentCallback, reasoningCallback, onComplete, onError) {
  const controller = new AbortController();
  setCurrentAbortController(controller);
  setHidden(document.getElementById('stopGenBtn'), false);
  setIsGenerating(true);
  renderMessages();

  try {
    const resp = await fetch(BETA_URL, {
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
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            const delta = chunk.choices?.[0]?.delta;
            if (delta) {
              if (delta.reasoning_content && reasoningCallback) reasoningCallback(delta.reasoning_content);
              if (delta.content && contentCallback) contentCallback(delta.content);
            }
          } catch (e) {}
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
  setHidden(document.getElementById('stopGenBtn'), true);
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

async function generateNewResponse(afterMsgId) {
  if (!ensureCanStartGeneration(true)) return;
  const idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  const context = buildApiContextThroughIndex(idx);
  const requestBody = buildRequestBody(context, getThinkingEnabled());

  const tempMessage = createMessage('assistant', '', { reasoning_content: '' });
  setActiveGeneratingMessageId(tempMessage.id);
  setMessages([...getMessages().slice(0, idx + 1), tempMessage, ...getMessages().slice(idx + 1)]);
  ensureAssistantVersion(tempMessage);
  renderMessages();
  persistMessages();

  await runAssistantTask(requestBody, tempMessage.id, '流式生成新回复...', '生成完成', { versionIndex: 0 });
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
  
  setActiveGeneratingMessageId(assistantId);
  await runAssistantTask(buildRequestBody(apiMessages, false), assistantId, '前缀续写中...', '续写完成', {
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
  if (historyBefore.length === 0) { setStatus('无上文，无法重新生成'); return; }
  const targetMsg = getMessages()[idx];
  const versionIndex = appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  setActiveGeneratingMessageId(assistantId);
  renderMessages();
  persistMessages();

  const requestBody = buildRequestBody(historyBefore.map(toApiMessage), getThinkingEnabled());
  await runAssistantTask(requestBody, assistantId, '重新生成中...', '重新生成完成', { versionIndex });
}
