/* ================================================================
   generation.js — Response generation: new, prefix, regenerate, stop
   ================================================================ */

(function() {

/* ---- Internal: generation lifecycle helpers ---- */

/** Reset generation state and hide stop button. */
function cleanupGeneration() {
  state.endGeneration();
  syncGenButtonStates();
  setHidden(DomRefs.stopBtn, true);
}

/** Orchestrate a streaming generation task: UI setup → stream → finalize. */
async function runAssistantTask(requestBody, msgId, loadingText, doneText, options) {
  if (options === undefined) options = {};
  var isPrefix = !!options.isPrefix;
  var originalContent = options.originalContent || '';
  var versionIndex = Number.isInteger(options.versionIndex) ? options.versionIndex : null;

  setHidden(DomRefs.stopBtn, false);
  setStatus(loadingText);
  var fullContent = '';

  try {
    await streamWithAbort(
      requestBody,
      // content callback
      function (chunk) {
        fullContent += chunk;
        mutateVersion(msgId, versionIndex, function (_msg, ver) {
          ver.content = isPrefix ? originalContent + fullContent : fullContent;
        });
        updateSingleMessageDOM(msgId);
      },
      // reasoning callback (skipped for prefix mode)
      isPrefix ? null : function (chunk) {
        mutateVersion(msgId, versionIndex, function (_msg, ver) {
          ver.reasoning_content = (ver.reasoning_content || '') + chunk;
        });
        updateSingleMessageDOM(msgId);
      }
    );
    // onComplete
    persistMessages();
    setStatus(doneText);
  } catch (err) {
    persistMessages();
    setStatus(err.message === 'ABORTED' ? STATUS.STOPPED : STATUS.ERROR_PREFIX + err.message);
  } finally {
    cleanupGeneration();
    updateSingleMessageDOM(msgId);
  }
}

function startGeneration(requestBody, msgId, options) {
  if (options === undefined) options = {};
  state.beginGeneration(msgId);
  syncGenButtonStates();
  refreshMessageDOM(msgId);
  persistMessages();
  return runAssistantTask(requestBody, msgId, STATUS.GENERATING, STATUS.DONE, options);
}

/* ---- Stop generation ---- */

function stopGeneration() {
  var msgId = state.activeGeneratingMessageId;
  if (state.currentAbortController) {
    state.currentAbortController.abort();
  }
  state.endGeneration();
  syncGenButtonStates();
  setHidden(DomRefs.stopBtn, true);
  if (msgId != null) updateSingleMessageDOM(msgId);
}

/* ---- Generation ---- */

async function generateNewResponse(afterMsgId) {
  var idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var context = buildApiContextThroughIndex(idx);
  var requestBody = buildRequestBody(context, state.config.thinkingEnabled);

  var tempMessage = createMessage('assistant', '', { reasoning_content: '' });
  state.insertMessageAt(idx + 1, tempMessage);
  applyCurrentVersion(tempMessage);

  await startGeneration(requestBody, tempMessage.id, { versionIndex: 0 });
}

async function prefixCompletion(assistantId) {
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
  // Button is disabled (gen-action) during generation, so no isGenerating guard needed here.
  var idx = findMessageIndexById(assistantId);
  if (idx === -1 || state.messages[idx].role !== 'assistant') return;
  var historyBefore = state.messages.slice(0, idx);
  var targetMsg = state.messages[idx];
  var versionIndex = appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  var requestBody = buildRequestBody(historyBefore.map(toApiMessage), state.config.thinkingEnabled);
  await startGeneration(requestBody, assistantId, { versionIndex });
}

window.stopGeneration = stopGeneration;
window.generateNewResponse = generateNewResponse;
window.prefixCompletion = prefixCompletion;
window.regenerateAssistant = regenerateAssistant;

})();
