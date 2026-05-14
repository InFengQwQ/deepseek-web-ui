/* ================================================================
   utils.js — Shared utility functions: setHidden, setStatus,
   formatMessageTime, autoResizeTextarea
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/** Toggle the `u-none` CSS class on an element. */
function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle('u-none', hidden);
}

/** Set status bar text, optionally reset after N ms. */
function setStatus(text, resetAfterMs) {
  if (resetAfterMs === undefined) resetAfterMs = 0;
  if (!App.DomRefs.statusMsg) return;
  App.DomRefs.statusMsg.innerText = text;
  if (resetAfterMs > 0) {
    setTimeout(function () {
      if (App.DomRefs.statusMsg && App.DomRefs.statusMsg.innerText === text) {
        App.DomRefs.statusMsg.innerText = App.STATUS.IDLE;
      }
    }, resetAfterMs);
  }
}

/** Convenience: set status to an error message with the standard prefix. */
function errorStatus(message, resetAfterMs) {
  setStatus(App.STATUS.ERROR_PREFIX + message, resetAfterMs);
}

/** Format a message timestamp to HH:MM. */
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

/* ---- Scroll helpers ---- */

function preserveScrollPosition(container, fn) {
  var isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < App.CFG.SCROLL_BOTTOM_THRESHOLD;
  var previousScrollTop = container.scrollTop;
  fn();
  if (isAtBottom) {
    container.scrollTop = container.scrollHeight;
  } else {
    container.scrollTop = previousScrollTop;
  }
}

function evaluateScrollToBottom() {
  var c = App.DomRefs.chatContainer;
  var b = App.DomRefs.scrollToBottomBtn;
  if (!c || !b) return;
  var distanceFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
  if (distanceFromBottom > App.CFG.SCROLL_BTN_THRESHOLD) {
    b.classList.remove('is-invisible');
  } else {
    b.classList.add('is-invisible');
  }
}

/** Wrap a function so errors (sync or async) are automatically displayed. */
function safeAsync(fn) {
  return function() {
    try {
      var result = fn.apply(this, arguments);
      if (result && typeof result.catch === 'function') {
        return result.catch(function(e) { App.errorStatus(e.message); });
      }
    } catch (e) {
      App.errorStatus(e.message);
    }
  };
}

App.setHidden = setHidden;
App.setStatus = setStatus;
App.errorStatus = errorStatus;
App.formatMessageTime = formatMessageTime;
App.autoResizeTextarea = autoResizeTextarea;
App.preserveScrollPosition = preserveScrollPosition;
App.evaluateScrollToBottom = evaluateScrollToBottom;
App.safeAsync = safeAsync;

})();
