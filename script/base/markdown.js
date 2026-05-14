/* ================================================================
   markdown.js — Markdown → HTML rendering pipeline

   Pipeline stages (in order):
     1. protectCodeBlocks  — replace fenced/inline code with %%CODE_N%% placeholders
     2. protectMath        — replace $...$, $$...$$, \(...\), \[...\] with %%MATH_N%%
     3. marked.parse       — parse remaining plain Markdown to HTML
     4a. restoreMathPlaceholders  — render %%MATH_N%% via KaTeX → MathML
     4b. restoreCodePlaceholders  — encode %%CODE_N%% as <pre><code> / <code>
     4c. sanitizeHtml      — DOMPurify sanitize (allows MathML tags/attrs)

   Why placeholders? Marked would mangle LaTeX delimiters and code fence
   contents. Protecting them before Marked ensures KaTeX and syntax
   highlighting work correctly.

   Depends on: marked.js, DOMPurify, KaTeX (global CDN scripts)
   ================================================================ */

(function() {
var App = window.App = window.App || {};

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

/* ---- Phase 4a: Restore math placeholders via KaTeX ---- */

function restoreMathPlaceholders(html, mathPlaceholders) {
  if (typeof katex === 'undefined' || mathPlaceholders.length === 0) return html;
  return html.replace(/%%MATH_(\d+)%%/g, function(_m, idx) {
    var item = mathPlaceholders[+idx];
    return item ? katex.renderToString(item.tex, { displayMode: item.displayMode, throwOnError: false }) : _m;
  });
}

/* ---- Phase 4b: Restore code placeholders ---- */

function encodeFencedBlock(raw) {
  var newlinePos = raw.indexOf('\n');
  var lang = raw.slice(3, newlinePos).trim();
  var body = raw.slice(newlinePos + 1, raw.length - 3);
  if (body.charCodeAt(body.length - 1) === 10) { body = body.slice(0, -1); }
  var langAttr = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
  return '<pre><code' + langAttr + '>' + escapeHtml(body) + '</code></pre>';
}

function restoreCodePlaceholders(html, codePlaceholders) {
  if (codePlaceholders.length === 0) return html;
  return html.replace(/%%CODE_(\d+)%%/g, function(_m, idx) {
    var raw = codePlaceholders[+idx];
    if (!raw) return _m;
    return raw.indexOf('```') === 0
      ? encodeFencedBlock(raw)
      : '<code>' + escapeHtml(raw.slice(1, -1)) + '</code>';
  });
}

/* ---- Phase 4c: Sanitize (allow MathML from KaTeX) ---- */

function sanitizeHtml(html) {
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

/* ---- Orchestrate the restore + sanitize pipeline ---- */

function restorePlaceholders(html, codePlaceholders, mathPlaceholders) {
  html = restoreMathPlaceholders(html, mathPlaceholders);
  html = restoreCodePlaceholders(html, codePlaceholders);
  return sanitizeHtml(html);
}

/** Render Markdown text to sanitized HTML, with KaTeX math support. */
function renderMarkdownToHTML(text) {
  var source = text || '';
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
}

App.renderMarkdownToHTML = renderMarkdownToHTML;

})();
