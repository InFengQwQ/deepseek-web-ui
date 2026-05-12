/* ================================================================
   utils.js — Shared utility functions, icons, and helpers
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
        DomRefs.statusSpan.innerText = CONST.STATUS_IDLE;
      }
    }, resetAfterMs);
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
