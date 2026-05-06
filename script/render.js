let chatContainer = null;
let statusSpan = null;
let stopBtn = null;
let scrollToBottomBtn = null;

function initRender() {
  chatContainer = DomRefs.chatContainer;
  statusSpan = DomRefs.statusSpan;
  stopBtn = DomRefs.stopBtn;
  scrollToBottomBtn = DomRefs.scrollToBottomBtn;
}

function renderMessages() {
  if (!chatContainer) return;
  if (getMessages().length === 0) {
    chatContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">开始新对话</div>
        <div class="empty-input-row">
          <div class="empty-input-spacer" aria-hidden="true"></div>
          <div class="empty-input-wrapper">
            <div class="empty-input-shell">
              <textarea id="emptyInput" placeholder="输入用户消息…" rows="1" autofocus></textarea>
            </div>
          </div>
          <button id="emptySendBtn" class="primary">发送</button>
        </div>
      </div>
    `;
    document.getElementById('emptySendBtn').onclick = () => {
      const input = document.getElementById('emptyInput');
      const content = input.value;
      setMessages([...getMessages(), createMessage('user', content)]);
      renderMessages();
      persistMessages();
    };
    const emptyInput = document.getElementById('emptyInput');
    const autoResize = () => {
      emptyInput.style.height = 'auto';
      const baseHeight = 36;
      const maxHeight = 168;
      const nextHeight = Math.min(Math.max(emptyInput.scrollHeight, baseHeight), maxHeight);
      emptyInput.style.height = nextHeight + 'px';
      if (emptyInput.scrollHeight > maxHeight) {
        emptyInput.style.overflowY = 'auto';
        emptyInput.scrollTop = emptyInput.scrollHeight;
      } else {
        emptyInput.style.overflowY = 'hidden';
      }
    };
    emptyInput.addEventListener('input', autoResize);
    autoResize();
    return;
  }

  const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
  const previousScrollTop = chatContainer.scrollTop;

  chatContainer.innerHTML = '';
  getMessages().forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message-item ${msg.role === 'user' ? 'user-msg' : 'assistant-msg'}`;
    msgDiv.dataset.id = msg.id;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'msg-meta';
    const roleSpan = document.createElement('span');
    roleSpan.className = `msg-role ${msg.role}`;
    roleSpan.innerText = msg.role === 'user' ? '用户' : 'DeepSeek';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.innerText = formatMessageTime(msg.createdAt);
    metaDiv.appendChild(roleSpan);
    metaDiv.appendChild(timeSpan);

    if (msg.role === 'assistant') {
      const versionNav = document.createElement('div');
      versionNav.className = 'version-nav';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'version-nav-btn';
      prevBtn.innerHTML = '&lsaquo;';

      const versionLabel = document.createElement('span');
      versionLabel.className = 'version-nav-label';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'version-nav-btn';
      nextBtn.innerHTML = '&rsaquo;';

      const versionCount = Array.isArray(msg.versions) && msg.versions.length > 0 ? msg.versions.length : 1;
      const currentVersionIndex = Number.isInteger(msg.currentVersionIndex) ? msg.currentVersionIndex : versionCount - 1;
      versionLabel.innerText = `${Math.min(currentVersionIndex + 1, versionCount)}/${versionCount}`;
      prevBtn.disabled = currentVersionIndex <= 0;
      nextBtn.disabled = currentVersionIndex >= versionCount - 1;
      prevBtn.onclick = () => setAssistantVersion(msg, currentVersionIndex - 1);
      nextBtn.onclick = () => setAssistantVersion(msg, currentVersionIndex + 1);

      versionNav.appendChild(prevBtn);
      versionNav.appendChild(versionLabel);
      versionNav.appendChild(nextBtn);
      metaDiv.appendChild(versionNav);
    }
    msgDiv.appendChild(metaDiv);

    if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
      const reasoningDiv = document.createElement('div');
      reasoningDiv.className = 'reasoning-block';
      const { header, state } = createReasoningHeader();
      const contentReason = document.createElement('div');
      contentReason.className = 'reasoning-text';
      contentReason.innerHTML = renderMarkdownToHTML(msg.reasoning_content);
      let collapsed = false;
      header.onclick = () => {
        collapsed = !collapsed;
        setHidden(contentReason, collapsed);
        state.innerText = collapsed ? '(已折叠)' : '(点击折叠)';
      };
      reasoningDiv.appendChild(header);
      reasoningDiv.appendChild(contentReason);
      msgDiv.appendChild(reasoningDiv);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    
    const shouldShowTyping =
      msg.id === getActiveGeneratingMessageId() &&
      !(msg.content && msg.content.length > 0) &&
      !(msg.reasoning_content && msg.reasoning_content.length > 0);
    if (shouldShowTyping) {
      contentDiv.innerHTML = '<span class="typing-indicator"></span>';
    } else {
      contentDiv.innerHTML = renderMarkdownToHTML(msg.content);
    }
    
    msgDiv.appendChild(contentDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'msg-actions';

    const mkIconBtn = (title, iconSvg, handler, disableDuringGen = false) => {
      const btn = document.createElement('button');
      btn.className = 'action-icon-btn';
      btn.title = title;
      btn.innerHTML = iconSvg;
      if (disableDuringGen && getIsGenerating()) btn.disabled = true;
      btn.onclick = handler;
      return btn;
    };

    actionsDiv.appendChild(mkIconBtn('插入', ICONS.insert, () => insertUserMessageAfter(msg.id), false));
    actionsDiv.appendChild(mkIconBtn('编辑', ICONS.edit, () => editMessage(msg.id, contentDiv, actionsDiv), false));
    actionsDiv.appendChild(mkIconBtn('删除', ICONS.delete, () => deleteMessage(msg.id), false));

    const sep1 = document.createElement('span');
    sep1.className = 'action-sep';
    actionsDiv.appendChild(sep1);

    actionsDiv.appendChild(mkIconBtn('生成响应', ICONS.generate, () => generateNewResponse(msg.id), true));

    if (msg.role === 'assistant') {
      const sep2 = document.createElement('span');
      sep2.className = 'action-sep';
      actionsDiv.appendChild(sep2);
      actionsDiv.appendChild(mkIconBtn('前缀续写', ICONS.prefix, () => prefixCompletion(msg.id), true));
      actionsDiv.appendChild(mkIconBtn('重新生成', ICONS.regenerate, () => regenerateAssistant(msg.id), true));
    }

    setHidden(actionsDiv, msg.id === getActiveGeneratingMessageId());

    msgDiv.appendChild(actionsDiv);
    chatContainer.appendChild(msgDiv);

    if (msg._isNew) {
      delete msg._isNew;
      editMessage(msg.id, contentDiv, actionsDiv, true);
    }
  });

  if (isAtBottom) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    chatContainer.scrollTop = previousScrollTop;
  }
  evaluateScrollToBottom();
}

function updateSingleMessageDOM(msgId) {
  const msg = findMessageById(msgId);
  if (!msg || !chatContainer) return;

  const msgDiv = chatContainer.querySelector(`.message-item[data-id="${msgId}"]`);
  if (!msgDiv) {
    renderMessages();
    return;
  }

  const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
  const previousScrollTop = chatContainer.scrollTop;

  if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
    let reasoningDiv = msgDiv.querySelector('.reasoning-block');
    if (!reasoningDiv) {
      reasoningDiv = document.createElement('div');
      reasoningDiv.className = 'reasoning-block';
      const { header, state } = createReasoningHeader();
      const contentReason = document.createElement('div');
      contentReason.className = 'reasoning-text';
      let collapsed = false;
      header.onclick = () => {
        collapsed = !collapsed;
        setHidden(contentReason, collapsed);
        state.innerText = collapsed ? '(已折叠)' : '(点击折叠)';
      };
      reasoningDiv.appendChild(header);
      reasoningDiv.appendChild(contentReason);
      const contentDiv = msgDiv.querySelector('.msg-content');
      msgDiv.insertBefore(reasoningDiv, contentDiv);
    }
    const textDiv = reasoningDiv.querySelector('.reasoning-text');
    if (textDiv) textDiv.innerHTML = renderMarkdownToHTML(msg.reasoning_content);
  }

  let contentDiv = msgDiv.querySelector('.msg-content');
  if (contentDiv && !contentDiv.querySelector('textarea')) {
    const shouldShowTyping =
      msg.id === getActiveGeneratingMessageId() &&
      !(msg.content && msg.content.length > 0) &&
      !(msg.reasoning_content && msg.reasoning_content.length > 0);
    if (shouldShowTyping) {
      contentDiv.innerHTML = '<span class="typing-indicator"></span>';
    } else {
      contentDiv.innerHTML = renderMarkdownToHTML(msg.content);
    }
  }

  let actionsDiv = msgDiv.querySelector('.msg-actions');
  if (actionsDiv) {
    setHidden(actionsDiv, msg.id === getActiveGeneratingMessageId());
  }

  if (isAtBottom) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    chatContainer.scrollTop = previousScrollTop;
  }
  evaluateScrollToBottom();
}

function evaluateScrollToBottom() {
  if (!chatContainer || !scrollToBottomBtn) return;
  const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
  if (distanceFromBottom > 100) {
    scrollToBottomBtn.classList.remove('hidden');
  } else {
    scrollToBottomBtn.classList.add('hidden');
  }
}

function insertUserMessageAfter(afterMsgId) {
  const idx = findMessageIndexById(afterMsgId);
  if (idx === -1) return;
  const newMsg = createMessage('user', '', { isNew: true });
  const newMessages = [...getMessages()];
  newMessages.splice(idx + 1, 0, newMsg);
  setMessages(newMessages);
  renderMessages();
  persistMessages();
}

function editMessage(msgId, contentDiv, actionsDiv, isNew = false) {
  const msg = findMessageById(msgId);
  if (!msg) return;

  if (contentDiv.querySelector('textarea')) return;

  const textarea = document.createElement('textarea');
  textarea.className = 'message-edit-textarea';
  textarea.value = msg.content;
  textarea.style.fieldSizing = 'content';

  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  textarea.addEventListener('input', autoResize);
  setTimeout(autoResize, 0);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'small primary';
  saveBtn.innerText = '保存';
  saveBtn.classList.add('message-edit-save');
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'small';
  cancelBtn.innerText = '取消';

  const editActions = document.createElement('div');
  editActions.className = 'message-edit-actions';
  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);

  contentDiv.innerHTML = '';
  contentDiv.appendChild(textarea);
  contentDiv.appendChild(editActions);

  if (actionsDiv) actionsDiv.style.opacity = '0';
  textarea.focus();

  saveBtn.onclick = () => {
    const newContent = textarea.value;
    if (msg.role === 'assistant') {
      const version = ensureAssistantVersion(msg);
      if (version) {
        version.content = newContent;
        version.reasoning_content = msg.reasoning_content || null;
        syncAssistantMessageToCurrentVersion(msg);
      }
    } else {
      msg.content = newContent;
    }
    persistMessages();
    setStatus(isNew ? '消息已插入' : '消息已修改', 1500);
    renderMessages();
  };

  cancelBtn.onclick = () => {
    if (isNew) {
      deleteMessage(msg.id);
    } else {
      renderMessages();
    }
  };
}

function deleteMessage(msgId) {
  const idx = findMessageIndexById(msgId);
  if (idx !== -1) {
    setMessages([...getMessages().slice(0, idx), ...getMessages().slice(idx + 1)]);
    renderMessages();
    persistMessages();
    setStatus('消息已删除');
  }
}
