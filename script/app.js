/* ================================================================
   app.js — Application bootstrap entry point
   ================================================================ */

/** Bootstrap the application: init DOM, load state, wire events, render. */
function bootstrapApp() {
  initDomRefs();
  loadMessagesFromStorage();
  initActions();
  syncConfigToUI();
  renderMessages();
}

// Auto-bootstrap when DOM is ready (script loads with defer)
bootstrapApp();
