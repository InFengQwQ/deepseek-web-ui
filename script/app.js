/* ================================================================
   app.js — Application bootstrap entry point
   ================================================================ */

(function() {
var App = window.App = window.App || {};

function bootstrapApp() {
  try {
    App.initDomRefs();
    App.loadMessagesFromStorage();
    App.syncConfigToUI();
    App.renderMessages();
    App.bindAllEvents();
  } catch (e) {
    console.error('Bootstrap failed:', e);
    if (App.DomRefs.statusMsg) App.DomRefs.statusMsg.innerText = App.STATUS.BOOTSTRAP_ERROR_PREFIX + (e.message || e);
  }
}

bootstrapApp();

})();
