/* ================================================================
   generation.js — Response generation: new, prefix, regenerate, stop
   ================================================================ */

/* ---- Stop generation ---- */

function stopGeneration() {
  var msgId = state.activeGeneratingMessageId;
  if (state.currentAbortController) {
    state.currentAbortController.abort();
    state.currentAbortController = null;
  }
  state.isGenerating = false;
  state.activeGeneratingMessageId = null;
  setHidden(DomRefs.stopBtn, true);
  setStatus(CONST.STATUS_STOPPED);
  if (msgId != null) updateSingleMessageDOM(msgId);
}

/* ---- Generation ---- */

async function generateNewResponse(afterMsgId) {
  if (!ensureCanStartGeneration(true)) { setStatus(CONST.STATUS_BLOCKED); return; }
  var idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var context = buildApiContextThroughIndex(idx);
  var requestBody = buildRequestBody(context, state.config.thinkingEnabled);

  var tempMessage = createMessage('assistant', '', { reasoning_content: '' });
  state.messages = [...state.messages.slice(0, idx + 1), tempMessage, ...state.messages.slice(idx + 1)];
  applyCurrentVersion(tempMessage);

  await startGeneration(requestBody, tempMessage.id, { versionIndex: 0 });
}

async function prefixCompletion(assistantId) {
  if (!ensureCanStartGeneration(true)) { setStatus(CONST.STATUS_BLOCKED); return; }
  var targetIdx = findMessageIndexById(assistantId);
  if (targetIdx === -1) return;
  var targetMsg = findMessageById(assistantId);
  if (!targetMsg || targetMsg.role !== 'assistant') return;
  var historyBefore = state.messages.slice(0, targetIdx);
  var apiMessages = [
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
  if (!ensureCanStartGeneration(false)) { setStatus(CONST.STATUS_BLOCKED_RETRY); return; }
  var idx = findMessageIndexById(assistantId);
  if (idx === -1 || state.messages[idx].role !== 'assistant') return;
  var historyBefore = state.messages.slice(0, idx);
  var targetMsg = state.messages[idx];
  var versionIndex = appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  var requestBody = buildRequestBody(historyBefore.map(toApiMessage), state.config.thinkingEnabled);
  await startGeneration(requestBody, assistantId, { versionIndex });
}
