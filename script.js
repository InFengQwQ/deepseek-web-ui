(function() {
  // ---------- 状态 ----------
  let messages = [];
  let nextId = 1;
  let isGenerating = false;
  let activeGeneratingMessageId = null;
  let currentAbortController = null;

  let apiKey = localStorage.getItem('ds_api_key') || '';
  let model = localStorage.getItem('ds_model') || 'deepseek-v4-pro';
  let thinkingEnabled = localStorage.getItem('ds_thinking') === 'true';
  let reasoningEffort = localStorage.getItem('ds_reasoning_effort') || 'max';
  let temperature = parseFloat(localStorage.getItem('ds_temp') || '0.7');

  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  const thinkingToggle = document.getElementById('thinkingToggle');
  const effortSelect = document.getElementById('effortSelect');
  const tempInput = document.getElementById('tempInput');
  const effortField = document.getElementById('effortField');
  const tempField = document.getElementById('tempField');
  const saveBtn = document.getElementById('saveConfigBtn');
  const clearBtn = document.getElementById('clearHistoryBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const chatContainer = document.getElementById('chatContainer');
  const statusSpan = document.getElementById('statusMsg');
  const stopBtn = document.getElementById('stopGenBtn');
  const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');

  function escapeHtml(input) {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderMarkdownToHTML(text) {
    const source = text || '';
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
      const rawHtml = marked.parse(source, { breaks: true, gfm: true });
      return DOMPurify.sanitize(rawHtml);
    }
    return `<p>${escapeHtml(source).replace(/\n/g, '<br>')}</p>`;
  }

  // SVG 图标集
  const ICONS = {
    insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    generate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    regenerate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
    prefix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
  };

  function persistMessages() {
    localStorage.setItem('ds_chat_messages', JSON.stringify(messages.map(m => ({
      id: m.id, role: m.role, content: m.content,
      reasoning_content: m.reasoning_content || null
    }))));
  }

  function loadMessagesFromStorage() {
    const stored = localStorage.getItem('ds_chat_messages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          messages = parsed;
          nextId = Math.max(0, ...parsed.map(m => m.id), 0) + 1;
        }
      } catch (e) { console.warn(e); }
    }
  }

  function updateThinkingUI() {
    const enabled = thinkingToggle.checked;
    thinkingEnabled = enabled;
    effortField.style.display = enabled ? '' : 'none';
    tempField.style.display = enabled ? 'none' : '';
    localStorage.setItem('ds_thinking', enabled);
  }

  function syncConfigToUI() {
    apiKeyInput.value = apiKey;
    modelSelect.value = model;
    thinkingToggle.checked = thinkingEnabled;
    effortSelect.value = reasoningEffort;
    tempInput.value = temperature;
    updateThinkingUI();
  }

  function saveConfiguration() {
    apiKey = apiKeyInput.value.trim();
    model = modelSelect.value;
    thinkingEnabled = thinkingToggle.checked;
    reasoningEffort = effortSelect.value;
    const newTemp = parseFloat(tempInput.value);
    if (!isNaN(newTemp)) temperature = newTemp;
    localStorage.setItem('ds_api_key', apiKey);
    localStorage.setItem('ds_model', model);
    localStorage.setItem('ds_thinking', thinkingEnabled);
    localStorage.setItem('ds_reasoning_effort', reasoningEffort);
    localStorage.setItem('ds_temp', temperature);
    statusSpan.innerText = '配置已保存';
    setTimeout(() => { if (statusSpan.innerText === '配置已保存') statusSpan.innerText = '就绪'; }, 1500);
  }

  function stopGeneration() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    isGenerating = false;
    activeGeneratingMessageId = null;
    stopBtn.style.display = 'none';
    statusSpan.innerText = '生成已停止';
    renderMessages();
  }

  function renderMessages() {
    if (!chatContainer) return;
    if (messages.length === 0) {
      chatContainer.innerHTML = `
        <div class="empty-state">
          <div style="font-weight:500;">开始新对话</div>
          <div class="empty-input-row">
            <input type="text" id="emptyInput" placeholder="输入用户消息…" autofocus>
            <button id="emptySendBtn" class="primary">发送</button>
          </div>
        </div>
      `;
      document.getElementById('emptySendBtn').onclick = () => {
        const input = document.getElementById('emptyInput');
        const content = input.value;
        messages.push({ id: nextId++, role: 'user', content, reasoning_content: null });
        renderMessages();
        persistMessages();
      };
      document.getElementById('emptyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('emptySendBtn').click();
      });
      return;
    }

    const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
    const previousScrollTop = chatContainer.scrollTop;

    chatContainer.innerHTML = '';
    messages.forEach(msg => {
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
      timeSpan.innerText = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      metaDiv.appendChild(roleSpan);
      metaDiv.appendChild(timeSpan);
      msgDiv.appendChild(metaDiv);

      if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
        const reasoningDiv = document.createElement('div');
        reasoningDiv.className = 'reasoning-block';
        const headerSpan = document.createElement('div');
        headerSpan.className = 'reasoning-header';
        headerSpan.innerHTML = '思考过程 <span style="font-size:0.65rem;">(点击折叠)</span>';
        const contentReason = document.createElement('div');
        contentReason.className = 'reasoning-text';
        contentReason.innerHTML = renderMarkdownToHTML(msg.reasoning_content);
        let collapsed = false;
        headerSpan.onclick = () => {
          collapsed = !collapsed;
          contentReason.style.display = collapsed ? 'none' : 'block';
          headerSpan.innerHTML = collapsed ? '思考过程 <span style="font-size:0.65rem;">(已折叠)</span>' : '思考过程 <span style="font-size:0.65rem;">(点击折叠)</span>';
        };
        reasoningDiv.appendChild(headerSpan);
        reasoningDiv.appendChild(contentReason);
        msgDiv.appendChild(reasoningDiv);
      }

      const contentDiv = document.createElement('div');
      contentDiv.className = 'msg-content';
      
      // 仅在真正没有任何可显示内容时展示等待动画，避免覆盖流式正文
      const shouldShowTyping =
        msg.id === activeGeneratingMessageId &&
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
        if (disableDuringGen && isGenerating) btn.disabled = true;
        btn.onclick = handler;
        return btn;
      };

      // 组1：增、删、改（任何时候都可用）
      actionsDiv.appendChild(mkIconBtn('插入', ICONS.insert, () => insertUserMessageAfter(msg.id), false));
      actionsDiv.appendChild(mkIconBtn('编辑', ICONS.edit, () => editMessage(msg.id, contentDiv, actionsDiv), false));
      actionsDiv.appendChild(mkIconBtn('删除', ICONS.delete, () => deleteMessage(msg.id), false));

      const sep1 = document.createElement('span');
      sep1.className = 'action-sep';
      actionsDiv.appendChild(sep1);

      // 组2：生成响应（仅非生成状态可用）
      actionsDiv.appendChild(mkIconBtn('生成响应', ICONS.generate, () => generateNewResponse(msg.id), true));

      // 组3：针对助手的续写和重新生成（非生成可用）
      if (msg.role === 'assistant') {
        const sep2 = document.createElement('span');
        sep2.className = 'action-sep';
        actionsDiv.appendChild(sep2);
        actionsDiv.appendChild(mkIconBtn('前缀续写', ICONS.prefix, () => prefixCompletion(msg.id), true));
        actionsDiv.appendChild(mkIconBtn('重新生成', ICONS.regenerate, () => regenerateAssistant(msg.id), true));
      }

      if (msg.id === activeGeneratingMessageId) {
        actionsDiv.style.display = 'none';
      }

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

  // ---------- 消息操作 ----------
  function insertUserMessageAfter(msgId) {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    messages.splice(idx + 1, 0, { id: nextId++, role: 'user', content: '', _isNew: true });
    renderMessages();
  }

  function editMessage(msgId, contentDiv, actionsDiv, isNew = false) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    if (contentDiv.querySelector('textarea')) return;

    const textarea = document.createElement('textarea');
    textarea.value = msg.content;
    textarea.style.width = '100%';
    textarea.style.minHeight = '100px';
    textarea.style.fontFamily = 'inherit';
    textarea.style.padding = '0.5rem';
    textarea.style.marginTop = '0.5rem';
    textarea.style.borderRadius = '0.4rem';
    textarea.style.border = '1px solid #dce2eb';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.boxSizing = 'border-box';
    textarea.style.fieldSizing = 'content'; // 现代浏览器支持

    // 兼容传统浏览器的自动高度调节
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    textarea.addEventListener('input', autoResize);
    setTimeout(autoResize, 0);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'small primary';
    saveBtn.innerText = '保存';
    saveBtn.style.marginRight = '0.5rem';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'small';
    cancelBtn.innerText = '取消';

    const editActions = document.createElement('div');
    editActions.style.marginTop = '0.5rem';
    editActions.appendChild(saveBtn);
    editActions.appendChild(cancelBtn);

    contentDiv.innerHTML = '';
    contentDiv.appendChild(textarea);
    contentDiv.appendChild(editActions);

    if (actionsDiv) actionsDiv.style.opacity = '0';
    textarea.focus();

    saveBtn.onclick = () => {
      const newContent = textarea.value;
      msg.content = newContent;
      persistMessages();
      statusSpan.innerText = isNew ? '消息已插入' : '消息已修改';
      setTimeout(() => { statusSpan.innerText = '就绪'; }, 1500);
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
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      messages.splice(idx, 1);
      renderMessages();
      persistMessages();
      statusSpan.innerText = '消息已删除';
    }
  }

  // ---------- API 流式调用 ----------
  const BETA_URL = 'https://api.deepseek.com/beta/chat/completions';

  function buildRequestBody(messagesArray, useThinking, extra = {}) {
    const body = {
      model: model,
      messages: messagesArray,
      max_tokens: 4096,
      stream: true,
    };
    if (useThinking) {
      body.extra_body = { thinking: { type: "enabled", reasoning_effort: reasoningEffort } };
    } else {
      body.extra_body = { thinking: { type: "disabled" } };
      body.temperature = temperature;
    }
    Object.assign(body, extra);
    return body;
  }

  async function streamWithAbort(requestBody, contentCallback, reasoningCallback, onComplete, onError) {
    const controller = new AbortController();
    currentAbortController = controller;
    stopBtn.style.display = 'flex';
    isGenerating = true;
    renderMessages();

    try {
      const resp = await fetch(BETA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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

  // ---------- 局部更新单条消息 DOM (避免流式输出时引发按钮频闪) ----------
  function updateSingleMessageDOM(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !chatContainer) return;

    const msgDiv = chatContainer.querySelector(`.message-item[data-id="${msgId}"]`);
    if (!msgDiv) {
      renderMessages();
      return;
    }

    const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
    const previousScrollTop = chatContainer.scrollTop;

    // 1. 更新 reasoning-block
    if (msg.role === 'assistant' && msg.reasoning_content && msg.reasoning_content.trim()) {
      let reasoningDiv = msgDiv.querySelector('.reasoning-block');
      if (!reasoningDiv) {
        reasoningDiv = document.createElement('div');
        reasoningDiv.className = 'reasoning-block';
        const headerSpan = document.createElement('div');
        headerSpan.className = 'reasoning-header';
        headerSpan.innerHTML = '思考过程 <span style="font-size:0.65rem;">(点击折叠)</span>';
        const contentReason = document.createElement('div');
        contentReason.className = 'reasoning-text';
        
        let collapsed = false;
        headerSpan.onclick = () => {
          collapsed = !collapsed;
          contentReason.style.display = collapsed ? 'none' : 'block';
          headerSpan.innerHTML = collapsed ? '思考过程 <span style="font-size:0.65rem;">(已折叠)</span>' : '思考过程 <span style="font-size:0.65rem;">(点击折叠)</span>';
        };
        reasoningDiv.appendChild(headerSpan);
        reasoningDiv.appendChild(contentReason);
        
        const contentDiv = msgDiv.querySelector('.msg-content');
        msgDiv.insertBefore(reasoningDiv, contentDiv);
      }
      const textDiv = reasoningDiv.querySelector('.reasoning-text');
      if (textDiv) textDiv.innerHTML = renderMarkdownToHTML(msg.reasoning_content);
    }

    // 2. 更新 msg-content
    let contentDiv = msgDiv.querySelector('.msg-content');
    if (contentDiv && !contentDiv.querySelector('textarea')) {
      const shouldShowTyping =
        msg.id === activeGeneratingMessageId &&
        !(msg.content && msg.content.length > 0) &&
        !(msg.reasoning_content && msg.reasoning_content.length > 0);
      if (shouldShowTyping) {
        contentDiv.innerHTML = '<span class="typing-indicator"></span>';
      } else {
        contentDiv.innerHTML = renderMarkdownToHTML(msg.content);
      }
    }

    // 3. 处理正在生成状态下的消息按钮栏显示与否
    let actionsDiv = msgDiv.querySelector('.msg-actions');
    if (actionsDiv) {
      if (msg.id === activeGeneratingMessageId) {
        actionsDiv.style.display = 'none';
      } else {
        actionsDiv.style.display = '';
      }
    }

    if (isAtBottom) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
      chatContainer.scrollTop = previousScrollTop;
    }
    evaluateScrollToBottom();
  }

  function cleanupGeneration() {
    isGenerating = false;
    activeGeneratingMessageId = null;
    currentAbortController = null;
    stopBtn.style.display = 'none';
    messages.forEach(m => { delete m._isTyping; });
    renderMessages();
  }

  async function runAssistantTask(requestBody, msgId, loadingText, doneText, isPrefix = false, originalContent = '') {
    statusSpan.innerText = loadingText;
    let fullContent = '';
    await streamWithAbort(
      requestBody,
      (chunk) => {
        fullContent += chunk;
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
          delete msg._isTyping;
          msg.content = isPrefix ? originalContent + fullContent : fullContent;
          updateSingleMessageDOM(msgId);
        }
      },
      isPrefix ? null : (chunk) => {
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
          delete msg._isTyping;
          msg.reasoning_content = (msg.reasoning_content || '') + chunk;
          updateSingleMessageDOM(msgId);
        }
      },
      () => {
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
          delete msg._isTyping;
          if (!isPrefix && !fullContent) msg.content = '[空响应]';
        }
        persistMessages();
        renderMessages();
        statusSpan.innerText = doneText;
      },
      (err) => {
        statusSpan.innerText = `错误: ${err.message}`;
        persistMessages();
        renderMessages();
      }
    );
  }

  // 生成响应：基于 afterMsgId 之前的上下文，在 afterMsgId 之后插入助手回复
  async function generateNewResponse(afterMsgId) {
    if (isGenerating) { statusSpan.innerText = '请等待当前任务完成'; return; }
    if (!apiKey) { statusSpan.innerText = '请填写 API Key'; return; }
    const idx = messages.findIndex(m => m.id === afterMsgId);
    if (idx === -1) return;
    const context = messages.slice(0, idx + 1).map(m => ({ role: m.role, content: m.content }));
    const requestBody = buildRequestBody(context, thinkingEnabled);

    const tempId = nextId++;
    activeGeneratingMessageId = tempId;
    messages.splice(idx + 1, 0, { id: tempId, role: 'assistant', content: '', reasoning_content: '', _isTyping: true });
    renderMessages();
    persistMessages();

    await runAssistantTask(requestBody, tempId, '流式生成新回复...', '生成完成');
  }

  async function prefixCompletion(assistantId) {
    if (isGenerating) { statusSpan.innerText = '请等待当前任务完成'; return; }
    if (!apiKey) { statusSpan.innerText = '请填写 API Key'; return; }
    const targetMsg = messages.find(m => m.id === assistantId);
    if (!targetMsg || targetMsg.role !== 'assistant') return;
    const historyBefore = messages.slice(0, messages.indexOf(targetMsg));
    const apiMessages = [
      ...historyBefore.map(m => ({ role: m.role, content: m.content })),
      { role: 'assistant', content: targetMsg.content, prefix: true }
    ];
    
    targetMsg._isTyping = true;
    activeGeneratingMessageId = assistantId;
    await runAssistantTask(buildRequestBody(apiMessages, false), assistantId, '前缀续写中...', '续写完成', true, targetMsg.content);
  }

  async function regenerateAssistant(assistantId) {
    if (isGenerating) { statusSpan.innerText = '请等待当前任务完成'; return; }
    const idx = messages.findIndex(m => m.id === assistantId);
    if (idx === -1 || messages[idx].role !== 'assistant') return;
    const historyBefore = messages.slice(0, idx);
    if (historyBefore.length === 0) { statusSpan.innerText = '无上文，无法重新生成'; return; }
    messages.splice(idx, messages.length - idx);
    
    const tempId = nextId++;
    activeGeneratingMessageId = tempId;
    messages.push({ id: tempId, role: 'assistant', content: '', reasoning_content: '', _isTyping: true });
    renderMessages();
    persistMessages();

    const requestBody = buildRequestBody(historyBefore.map(m => ({ role: m.role, content: m.content })), thinkingEnabled);
    await runAssistantTask(requestBody, tempId, '重新生成中...', '重新生成完成');
  }

  function exportConversation() {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role, content: m.content,
        reasoning_content: m.reasoning_content || null
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepseek_chat_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    statusSpan.innerText = '对话已导出';
    setTimeout(() => { statusSpan.innerText = '就绪'; }, 1500);
  }

  function importConversation(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        let msgs = imported.messages || imported;
        if (!Array.isArray(msgs)) throw new Error('无效格式');
        const newMsgs = msgs.map(msg => ({
          id: nextId++,
          role: msg.role,
          content: msg.content,
          reasoning_content: msg.reasoning_content || null
        }));
        if (newMsgs.length === 0) throw new Error('无有效消息');
        messages = newMsgs;
        renderMessages();
        persistMessages();
        statusSpan.innerText = `已导入 ${messages.length} 条消息`;
        setTimeout(() => { statusSpan.innerText = '就绪'; }, 2000);
      } catch (err) {
        statusSpan.innerText = `导入失败: ${err.message}`;
      }
    };
    reader.readAsText(file);
  }

  function clearAllMessages() {
    if (confirm('清空所有对话？')) {
      messages = [];
      nextId = 1;
      renderMessages();
      persistMessages();
      statusSpan.innerText = '对话已清空';
    }
  }

  function evaluateScrollToBottom() {
    if (!chatContainer) return;
    const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
    if (isAtBottom) {
      scrollToBottomBtn.classList.add('hidden');
    } else {
      scrollToBottomBtn.classList.remove('hidden');
    }
  }

  function bindEvents() {
    thinkingToggle.addEventListener('change', updateThinkingUI);
    saveBtn.onclick = saveConfiguration;
    clearBtn.onclick = clearAllMessages;
    exportBtn.onclick = exportConversation;
    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => { if (e.target.files[0]) importConversation(e.target.files[0]); };
      input.click();
    };
    stopBtn.onclick = stopGeneration;
    chatContainer.addEventListener('scroll', evaluateScrollToBottom);
    scrollToBottomBtn.onclick = () => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    };
  }

  function init() {
    syncConfigToUI();
    loadMessagesFromStorage();
    bindEvents();
    renderMessages();
  }

  init();
})();
