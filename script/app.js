/* ================================================================
   app.js — Application bootstrap entry point
   ================================================================ */

(function() {

/** Bootstrap the application. */
function bootstrapApp() {
  initDomRefs();
  loadMessagesFromStorage();
  syncConfigToUI();
  renderMessages();
  bindAllEvents();
}

bootstrapApp();

})();
