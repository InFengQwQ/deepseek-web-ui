/* ================================================================
   generation.js — Response generation: new, prefix, regenerate, stop
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/* ---- Internal: generation lifecycle helpers ---- */

/** Reset generation state and hide stop button. */
function cleanupGeneration() {
  App.state.endGeneration();
  App.syncGenButtonStates();
  App.setHidden(App.DomRefs.stopBtn, true);
}

/** Orchestrate a streaming generation task: UI setup → stream → finalize. */
async function runAssistantTask(requestBody, msgId, loadingText, doneText, options) {
  if (options === undefined) options = {};
  var isPrefix = !!options.isPrefix;
  var originalContent = options.originalContent || '';
  var versionIndex = Number.isInteger(options.versionIndex) ? options.versionIndex : null;

  App.setHidden(App.DomRefs.stopBtn, false);
  App.setStatus(loadingText);
  var fullContent = '';

  try {
    await App.streamWithAbort(
      requestBody,
      // content callback
      function (chunk) {
        fullContent += chunk;
        App.mutateVersion(msgId, versionIndex, function (_msg, ver) {
          ver.content = isPrefix ? originalContent + fullContent : fullContent;
        });
        App.updateSingleMessageDOM(msgId);
      },
      // reasoning callback (skipped for prefix mode)
      isPrefix ? null : function (chunk) {
        App.mutateVersion(msgId, versionIndex, function (_msg, ver) {
          ver.reasoning_content = (ver.reasoning_content || '') + chunk;
        });
        App.updateSingleMessageDOM(msgId);
      }
    );
    // onComplete
    App.persistMessages();
    App.setStatus(doneText);
  } catch (err) {
    App.persistMessages();
    if (err.message === 'ABORTED') {
      App.setStatus(App.STATUS.STOPPED);
    } else {
      App.errorStatus(err.message);
    }
  } finally {
    cleanupGeneration();
    App.updateSingleMessageDOM(msgId);
  }
}

function startGeneration(requestBody, msgId, options) {
  if (options === undefined) options = {};
  App.state.beginGeneration(msgId);
  App.syncGenButtonStates();
  App.refreshMessageDOM(msgId);
  App.persistMessages();
  return runAssistantTask(requestBody, msgId, App.STATUS.GENERATING, App.STATUS.DONE, options);
}

/* ---- Stop generation ---- */

function stopGeneration() {
  var msgId = App.state.activeGeneratingMessageId;
  if (App.state.currentAbortController) {
    App.state.currentAbortController.abort();
  }
  App.state.endGeneration();
  App.syncGenButtonStates();
  App.setHidden(App.DomRefs.stopBtn, true);
  if (msgId != null) App.updateSingleMessageDOM(msgId);
}

/* ---- Generation ---- */

async function generateNewResponse(afterMsgId) {
  var idx = App.findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var context = App.buildApiContextThroughIndex(idx);
  var requestBody = App.buildRequestBody(context, App.state.config.thinkingEnabled);

  var tempMessage = App.createMessage('assistant', '', { reasoning_content: '' });
  App.state.insertMessageAt(idx + 1, tempMessage);
  App.applyCurrentVersion(tempMessage);

  await startGeneration(requestBody, tempMessage.id, { versionIndex: 0 });
}

async function prefixCompletion(assistantId) {
  var targetIdx = App.findMessageIndexById(assistantId);
  if (targetIdx === -1) return;
  var targetMsg = App.findMessageById(assistantId);
  if (!targetMsg || targetMsg.role !== 'assistant') return;
  var historyBefore = App.state.messages.slice(0, targetIdx);
  var apiMessages = [
    ...historyBefore.map(App.toApiMessage),
    { role: 'assistant', content: targetMsg.content, prefix: true }
  ];

  await startGeneration(App.buildRequestBody(apiMessages, false), assistantId, {
    isPrefix: true,
    originalContent: targetMsg.content,
    versionIndex: targetMsg.currentVersionIndex
  });
}

async function regenerateAssistant(assistantId) {
  // Button is disabled (gen-action) during generation, so no isGenerating guard needed here.
  var idx = App.findMessageIndexById(assistantId);
  if (idx === -1 || App.state.messages[idx].role !== 'assistant') return;
  var historyBefore = App.state.messages.slice(0, idx);
  var targetMsg = App.state.messages[idx];
  var versionIndex = App.appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  var requestBody = App.buildRequestBody(historyBefore.map(App.toApiMessage), App.state.config.thinkingEnabled);
  await startGeneration(requestBody, assistantId, { versionIndex });
}

App.stopGeneration = stopGeneration;
App.generateNewResponse = generateNewResponse;
App.prefixCompletion = prefixCompletion;
App.regenerateAssistant = regenerateAssistant;

})();
