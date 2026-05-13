/* ================================================================
   utils.js — Shared utility functions: setHidden, setStatus,
   formatMessageTime, autoResizeTextarea
   ================================================================ */

/** Toggle the `u-none` CSS class on an element. */
function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('u-none', hidden);
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
