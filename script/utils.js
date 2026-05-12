/* ================================================================
   utils.js — Shared utility functions, icons, and helpers
   Depends on: marked.js, DOMPurify, KaTeX (global CDN scripts)
   ================================================================ */

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('is-hidden', hidden);
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdownToHTML(text) {
  const source = text || '';
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    return `<p>${escapeHtml(source).replace(/\n/g, '<br>')}</p>`;
  }

  // Step 1: Protect code blocks and inline code so math delimiters inside them are ignored
  const codePlaceholders = [];
  let protectedText = source.replace(/```[\s\S]*?```|`[^`\n]+`/g, function (match) {
    const idx = codePlaceholders.length;
    codePlaceholders.push(match);
    return '%%CODE_' + idx + '%%';
  });

  // Step 2: Protect math formulas — display math first, then inline math
  // Model uses both LaTeX conventions: \[...\] / \(...\)  and  $$...$$ / $...$
  const mathPlaceholders = [];
  const mathPatterns = [
    { regex: /\\\[([\s\S]*?)\\\]/g, displayMode: true },
    { regex: /\$\$([\s\S]*?)\$\$/g,   displayMode: true },
    { regex: /\\\(([\s\S]*?)\\\)/g,   displayMode: false },
    { regex: /\$([^$\n]+?)\$/g,       displayMode: false }
  ];

  mathPatterns.forEach(function (p) {
    protectedText = protectedText.replace(p.regex, function (_match, tex) {
      const idx = mathPlaceholders.length;
      mathPlaceholders.push({ tex: tex.trim(), displayMode: p.displayMode });
      return '%%MATH_' + idx + '%%';
    });
  });

  // Step 3: Parse remaining text as Markdown
  let html = marked.parse(protectedText, { breaks: true, gfm: true });

  // Step 4: Replace math placeholders with KaTeX-rendered HTML
  if (typeof katex !== 'undefined') {
    for (let i = 0; i < mathPlaceholders.length; i++) {
      const item = mathPlaceholders[i];
      html = html.split('%%MATH_' + i + '%%').join(
        katex.renderToString(item.tex, {
          displayMode: item.displayMode,
          throwOnError: false
        })
      );
    }
  }

  // Step 5: Restore code placeholders
  function encodeFencedBlock(raw) {
    const newlinePos = raw.indexOf('\n');
    const lang = raw.slice(3, newlinePos).trim();
    let body = raw.slice(newlinePos + 1, raw.length - 3);
    if (body.charCodeAt(body.length - 1) === 10) { body = body.slice(0, -1); }
    const langAttr = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
    return '<pre><code' + langAttr + '>' + escapeHtml(body) + '</code></pre>';
  }

  for (let c = 0; c < codePlaceholders.length; c++) {
    const raw = codePlaceholders[c];
    html = html.split('%%CODE_' + c + '%%').join(
      raw.indexOf('```') === 0
        ? encodeFencedBlock(raw)
        : '<code>' + escapeHtml(raw.slice(1, -1)) + '</code>'
    );
  }

  // Step 6: Sanitize — allow MathML tags that KaTeX emits for accessibility
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

const ICONS = {
  insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  generate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  regenerate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
  prefix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
};

function createReasoningHeader(initialCollapsed) {
  const header = document.createElement('div');
  header.className = 'reasoning-header';

  const title = document.createElement('span');
  title.innerText = '思考过程';

  const state = document.createElement('span');
  state.className = 'reasoning-header-state';
  state.innerText = initialCollapsed ? '(已折叠)' : '(点击折叠)';

  header.appendChild(title);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(state);

  return { header: header, state: state };
}

function autoResizeTextarea(textarea, options) {
  if (options === undefined) options = {};
  const minHeight = options.minHeight || 0;
  const maxHeight = options.maxHeight || Number.POSITIVE_INFINITY;
  const clampOverflow = options.clampOverflow || false;
  const applyInitialHeight = options.applyInitialHeight !== false;

  const resize = function (opts) {
    if (opts === undefined) opts = {};
    if (opts.applyHeight !== false) {
      textarea.style.height = 'auto';
    }
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
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
