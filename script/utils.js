/* ================================================================
   utils.js — Shared utility functions, icons, and helpers
   Depends on: marked.js, DOMPurify, KaTeX (global CDN scripts)
   ================================================================ */

/** Toggle the `is-hidden` CSS class on an element. */
function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('is-hidden', hidden);
}

/* Set status bar text, optionally reset after N ms. */
function setStatus(text, resetAfterMs) {
  if (resetAfterMs === undefined) resetAfterMs = 0;
  if (!DomRefs.statusSpan) return;
  DomRefs.statusSpan.innerText = text;
  if (resetAfterMs > 0) {
    setTimeout(function () {
      if (DomRefs.statusSpan && DomRefs.statusSpan.innerText === text) {
        DomRefs.statusSpan.innerText = '就绪';
      }
    }, resetAfterMs);
  }
}

/** Escape HTML special characters in a string. */
function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---- Markdown rendering pipeline steps ---- */

function protectCodeBlocks(text) {
  var placeholders = [];
  var result = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, function (match) {
    var idx = placeholders.length;
    placeholders.push(match);
    return '%%CODE_' + idx + '%%';
  });
  return { text: result, placeholders: placeholders };
}

function protectMath(text) {
  var placeholders = [];
  var patterns = [
    { regex: /\\\[([\s\S]*?)\\\]/g, displayMode: true },
    { regex: /\$\$([\s\S]*?)\$\$/g,   displayMode: true },
    { regex: /\\\(([\s\S]*?)\\\)/g,   displayMode: false },
    { regex: /\$([^$\n]+?)\$/g,       displayMode: false }
  ];
  for (var pi = 0; pi < patterns.length; pi++) {
    var p = patterns[pi];
    text = text.replace(p.regex, function (_match, tex) {
      var idx = placeholders.length;
      placeholders.push({ tex: tex.trim(), displayMode: p.displayMode });
      return '%%MATH_' + idx + '%%';
    });
  }
  return { text: text, placeholders: placeholders };
}

function restorePlaceholders(html, codePlaceholders, mathPlaceholders) {
  // Restore math placeholders via KaTeX
  if (typeof katex !== 'undefined') {
    for (var i = 0; i < mathPlaceholders.length; i++) {
      var item = mathPlaceholders[i];
      html = html.split('%%MATH_' + i + '%%').join(
        katex.renderToString(item.tex, { displayMode: item.displayMode, throwOnError: false })
      );
    }
  }

  // Restore code placeholders
  function encodeFencedBlock(raw) {
    var newlinePos = raw.indexOf('\n');
    var lang = raw.slice(3, newlinePos).trim();
    var body = raw.slice(newlinePos + 1, raw.length - 3);
    if (body.charCodeAt(body.length - 1) === 10) { body = body.slice(0, -1); }
    var langAttr = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
    return '<pre><code' + langAttr + '>' + escapeHtml(body) + '</code></pre>';
  }

  for (var c = 0; c < codePlaceholders.length; c++) {
    var raw = codePlaceholders[c];
    html = html.split('%%CODE_' + c + '%%').join(
      raw.indexOf('```') === 0
        ? encodeFencedBlock(raw)
        : '<code>' + escapeHtml(raw.slice(1, -1)) + '</code>'
    );
  }

  // Sanitize — allow MathML tags that KaTeX emits for accessibility
  return DOMPurify.sanitize(html, {
    ADD_TAGS: [
      'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo',
      'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot',
      'mover', 'munder', 'munderover', 'mtable', 'mtr', 'mtd',
      'mstyle', 'mspace', 'mpadded', 'mphantom', 'merror', 'menclose'
    ],
    ADD_ATTR: [
      'encoding', 'xmlns', 'displaystyle', 'scriptlevel',
      'mathvariant', 'mathsize', 'mathcolor', 'mathbackground',
      'linethickness', 'lspace', 'rspace', 'voffset'
    ]
  });
}

/** Render Markdown text to sanitized HTML, with KaTeX math support. */
function renderMarkdownToHTML(text) {
  var source = text || '';
  try {
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
      return '<p>' + escapeHtml(source).replace(/\n/g, '<br>') + '</p>';
    }

    // Step 1: Protect code blocks
    var codeResult = protectCodeBlocks(source);

    // Step 2: Protect math formulas
    var mathResult = protectMath(codeResult.text);

    // Step 3: Parse remaining text as Markdown
    var html = marked.parse(mathResult.text, { breaks: true, gfm: true });

    // Step 4: Restore math + code, then sanitize
    return restorePlaceholders(html, codeResult.placeholders, mathResult.placeholders);
  } catch (e) {
    return '<p style="color:#b91c1c">[渲染错误] ' + escapeHtml(String(e.message || e)) + '</p>';
  }
}

var ICONS = {
  insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  generate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  regenerate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
  prefix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
};

/* Format a message timestamp to HH:MM. */
function formatMessageTime(createdAt) {
  var date = createdAt ? new Date(createdAt) : new Date();
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Create a collapsible reasoning header element. */
function createReasoningHeader(initialCollapsed) {
  var header = document.createElement('div');
  header.className = 'reasoning-header';

  var title = document.createElement('span');
  title.innerText = '思考过程';

  var state = document.createElement('span');
  state.className = 'reasoning-header-state';
  state.innerText = initialCollapsed ? '(已折叠)' : '(点击折叠)';

  header.appendChild(title);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(state);

  return { header: header, state: state };
}

/** Create a complete reasoning block DOM element (collapsible). */
function createReasoningBlockDOM(reasoningContent) {
  var reasoningDiv = document.createElement('div');
  reasoningDiv.className = 'reasoning-block';

  var hdr = createReasoningHeader(false);
  var contentDiv = document.createElement('div');
  contentDiv.className = 'reasoning-text prose-content';
  contentDiv.innerHTML = renderMarkdownToHTML(reasoningContent);

  var collapsed = false;
  hdr.header.onclick = function () {
    collapsed = !collapsed;
    setHidden(contentDiv, collapsed);
    hdr.state.innerText = collapsed ? '(已折叠)' : '(点击折叠)';
  };

  reasoningDiv.appendChild(hdr.header);
  reasoningDiv.appendChild(contentDiv);
  return reasoningDiv;
}

/** Enable auto-resize on a textarea element. Returns a manual resize function. */
function autoResizeTextarea(textarea, options) {
  if (options === undefined) options = {};
  var minHeight = options.minHeight || 0;
  var maxHeight = options.maxHeight || Number.POSITIVE_INFINITY;
  var clampOverflow = options.clampOverflow || false;
  var applyInitialHeight = options.applyInitialHeight !== false;

  var resize = function (opts) {
    if (opts === undefined) opts = {};
    if (opts.applyHeight !== false) {
      textarea.style.height = 'auto';
    }
    var nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    if (opts.applyHeight !== false) {
      textarea.style.height = nextHeight + 'px';
    }

    if (clampOverflow) {
      if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
        textarea.scrollTop = textarea.scrollHeight;
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  textarea.addEventListener('input', function () { resize(); });
  resize({ applyHeight: applyInitialHeight });
  return resize;
}
