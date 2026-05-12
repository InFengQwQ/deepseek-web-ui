/* ================================================================
   actions.js — Chat actions: generation, message CRUD, import/export
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
  setStatus('生成已停止');
  if (msgId != null) updateSingleMessageDOM(msgId);
}

/* ---- Generation actions ---- */

async function generateNewResponse(afterMsgId) {
  if (!ensureCanStartGeneration(true)) return;
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
  if (!ensureCanStartGeneration(true)) return;
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
  if (!ensureCanStartGeneration(false)) return;
  var idx = findMessageIndexById(assistantId);
  if (idx === -1 || state.messages[idx].role !== 'assistant') return;
  var historyBefore = state.messages.slice(0, idx);
  var targetMsg = state.messages[idx];
  var versionIndex = appendAssistantVersion(targetMsg, { content: '', reasoning_content: '' });
  if (versionIndex === null) return;

  var requestBody = buildRequestBody(historyBefore.map(toApiMessage), state.config.thinkingEnabled);
  await startGeneration(requestBody, assistantId, { versionIndex });
}

/* ---- Clear all messages ---- */

function clearAllMessages() {
  if (confirm('清空对话？')) {
    state.messages = [];
    state.nextId = 1;
    renderMessages();
    persistMessages();
    setStatus('对话已清空');
  }
}

/* ---- Export / Import ---- */

function exportConversation() {
  var data = state.messages.map(serializeMessageRecord);
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'deepseek_chat_' + new Date().toISOString().slice(0, 19) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  setStatus('对话已导出', CONST.STATUS_TIMEOUT_SHORT);
}

function importConversation(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var imported = JSON.parse(e.target.result);
      var msgs = imported.messages || imported;
      if (!Array.isArray(msgs)) throw new Error('无效格式');
      var newMsgs = msgs.map(function (msg) {
        return normalizeMessageRecord({
          id: state.nextId++,
          role: msg.role,
          content: msg.content,
          reasoning_content: msg.reasoning_content || null,
          createdAt: msg.createdAt,
          versions: msg.versions,
          currentVersionIndex: msg.currentVersionIndex
        });
      });
      if (newMsgs.length === 0) throw new Error('无有效消息');
      state.messages = newMsgs;
      renderMessages();
      persistMessages();
      setStatus('已导入 ' + state.messages.length + ' 条消息', CONST.STATUS_TIMEOUT_LONG);
    } catch (err) {
      setStatus('导入失败: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ---- Message CRUD ---- */

function enterEditModeForNewMessages() {
  state.messages.forEach(function (msg) {
    if (!msg._isNew) return;
    delete msg._isNew;
    var msgDiv = DomRefs.chatContainer.querySelector('.message-item[data-id="' + msg.id + '"]');
    if (!msgDiv) return;
    var contentDiv = msgDiv.querySelector('.msg-content');
    var actionsDiv = msgDiv.querySelector('.msg-actions');
    if (contentDiv) editMessage(msg.id, contentDiv, actionsDiv, true);
  });
}

function insertUserMessageAfter(afterMsgId) {
  var idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  var newMsg = createMessage('user', '', { isNew: true });
  var newMessages = state.messages.slice();
  newMessages.splice(idx + 1, 0, newMsg);
  state.messages = newMessages;

  var afterDiv = DomRefs.chatContainer.querySelector('.message-item[data-id="' + afterMsgId + '"]');
  if (afterDiv) {
    var parts = renderMessageItem(newMsg);
    afterDiv.parentNode.insertBefore(parts.msgDiv, afterDiv.nextSibling);
  } else {
    renderMessages();
  }
  enterEditModeForNewMessages();
  persistMessages();
}

function editMessage(msgId, contentDiv, actionsDiv, isNew) {
  var msg = findMessageById(msgId);
  if (!msg) return;
  if (contentDiv.querySelector('textarea')) return;

  var textarea = document.createElement('textarea');
  textarea.className = 'compact-textarea message-edit-textarea';
  textarea.value = msg.content;

  var saveBtn = document.createElement('button');
  saveBtn.className = 'small primary message-edit-save';
  saveBtn.innerText = '保存';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'small';
  cancelBtn.innerText = '取消';

  var editActions = document.createElement('div');
  editActions.className = 'message-edit-actions';
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);
  contentDiv.appendChild(editActions);

  autoResizeTextarea(textarea);

  if (actionsDiv) actionsDiv.style.opacity = '0';
  textarea.focus();

  saveBtn.onclick = function () {
    var newContent = textarea.value;
    if (msg.role === 'assistant') {
      var version = applyCurrentVersion(msg);
      if (version) {
        version.content = newContent;
        version.reasoning_content = msg.reasoning_content || null;
        applyCurrentVersion(msg);
      }
    } else {
      msg.content = newContent;
    }
    persistMessages();
    setStatus(isNew ? '消息已插入' : '消息已修改', CONST.STATUS_TIMEOUT_SHORT);
    refreshMessageDOM(msg.id);
  };

  cancelBtn.onclick = function () {
    if (isNew) {
      deleteMessage(msg.id);
    } else {
      refreshMessageDOM(msg.id);
    }
  };
}

function deleteMessage(msgId) {
  var idx = findMessageIndexById(msgId);
  if (idx !== -1) {
    state.messages = state.messages.slice(0, idx).concat(state.messages.slice(idx + 1));
    var msgDiv = DomRefs.chatContainer.querySelector('.message-item[data-id="' + msgId + '"]');
    if (msgDiv) msgDiv.remove();
    if (state.messages.length === 0) renderEmptyState();
    persistMessages();
    setStatus('消息已删除');
  }
}

/* ---- Assistant version navigation (moved from state.js) ---- */

function setAssistantVersion(msg, versionIndex) {
  if (!msg || msg.role !== 'assistant') return;
  msg.currentVersionIndex = versionIndex;
  applyCurrentVersion(msg);
  persistMessages();
  refreshMessageDOM(msg.id);
}

/* ---- Event binding ---- */

function bindEvents() {
  DomRefs.clearBtn.onclick = clearAllMessages;
  DomRefs.exportBtn.onclick = exportConversation;
  DomRefs.importBtn.onclick = function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) { if (e.target.files[0]) importConversation(e.target.files[0]); };
    input.click();
  };
  DomRefs.stopBtn.onclick = stopGeneration;
  var scrollTicking = false;
  DomRefs.chatContainer.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(function () {
        evaluateScrollToBottom();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });
  DomRefs.scrollToBottomBtn.onclick = function () {
    DomRefs.chatContainer.scrollTop = DomRefs.chatContainer.scrollHeight;
  };
}

function initActions() {
  initConfig();
  bindEvents();
}
