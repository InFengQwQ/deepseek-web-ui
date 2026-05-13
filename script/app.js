/* ================================================================
   app.js — Application bootstrap entry point
   ================================================================ */

/** Bootstrap the application. */
function bootstrapApp() {
  initDomRefs();
  loadMessagesFromStorage();
  syncConfigToUI();
  renderMessages();
  bindAllEvents();
}

bootstrapApp();
