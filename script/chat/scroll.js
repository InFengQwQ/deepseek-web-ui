/* ================================================================
   scroll.js — Scroll helpers for chat container
   ================================================================ */

(function() {

function preserveScrollPosition(container, fn) {
  var isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < CFG.SCROLL_BOTTOM_THRESHOLD;
  var previousScrollTop = container.scrollTop;
  fn();
  if (isAtBottom) {
    container.scrollTop = container.scrollHeight;
  } else {
    container.scrollTop = previousScrollTop;
  }
}

function evaluateScrollToBottom() {
  var c = DomRefs.chatContainer;
  var b = DomRefs.scrollToBottomBtn;
  if (!c || !b) return;
  var distanceFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
  if (distanceFromBottom > CFG.SCROLL_BTN_THRESHOLD) {
    b.classList.remove('is-invisible');
  } else {
    b.classList.add('is-invisible');
  }
}

window.preserveScrollPosition = preserveScrollPosition;
window.evaluateScrollToBottom = evaluateScrollToBottom;

})();
