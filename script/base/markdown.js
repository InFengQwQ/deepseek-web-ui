/* ================================================================
   markdown.js — Markdown → HTML rendering pipeline
   Depends on: marked.js, DOMPurify, KaTeX (global CDN scripts)
   ================================================================ */

(function() {

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
  // Restore math placeholders via KaTeX — single regex pass (was O(n²) split/join)
  if (typeof katex !== 'undefined' && mathPlaceholders.length > 0) {
    html = html.replace(/%%MATH_(\d+)%%/g, function(_m, idx) {
      var item = mathPlaceholders[+idx];
      return item ? katex.renderToString(item.tex, { displayMode: item.displayMode, throwOnError: false }) : _m;
    });
  }

  // Restore code placeholders — single regex pass
  function encodeFencedBlock(raw) {
    var newlinePos = raw.indexOf('\n');
    var lang = raw.slice(3, newlinePos).trim();
    var body = raw.slice(newlinePos + 1, raw.length - 3);
    if (body.charCodeAt(body.length - 1) === 10) { body = body.slice(0, -1); }
    var langAttr = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
    return '<pre><code' + langAttr + '>' + escapeHtml(body) + '</code></pre>';
  }

  if (codePlaceholders.length > 0) {
    html = html.replace(/%%CODE_(\d+)%%/g, function(_m, idx) {
      var raw = codePlaceholders[+idx];
      if (!raw) return _m;
      return raw.indexOf('```') === 0
        ? encodeFencedBlock(raw)
        : '<code>' + escapeHtml(raw.slice(1, -1)) + '</code>';
    });
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
    return '<p style="color:#b91c1c">' + ERR.RENDER_FALLBACK + escapeHtml(String(e.message || e)) + '</p>';
  }
}

window.renderMarkdownToHTML = renderMarkdownToHTML;

})();
