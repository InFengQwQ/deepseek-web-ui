/* ================================================================
   actionbar.js — Action icon button factory & generation
   button state sync
   ================================================================ */

(function() {
var App = window.App = window.App || {};

/** Create an icon-only action button with title, SVG, and click handler. */
function createActionIconBtn(title, iconSvg, handler, extraClass) {
  var btn = document.createElement('button');
  btn.className = 'action-icon-btn' + (extraClass ? ' ' + extraClass : '');
  btn.title = title;
  btn.innerHTML = iconSvg;
  btn.onclick = handler;
  return btn;
}

/** Sync disabled state of all generation-action buttons with state.isGenerating. */
function syncGenButtonStates() {
  var buttons = document.querySelectorAll('.action-icon-btn.gen-action');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = App.state.isGenerating;
  }
}

App.createActionIconBtn = createActionIconBtn;
App.syncGenButtonStates = syncGenButtonStates;

})();
