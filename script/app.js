/* ================================================================
   app.js — Application bootstrap entry point
   ================================================================ */

(function() {

/** Bootstrap the application. */
function bootstrapApp() {
  try {
    initDomRefs();
    loadMessagesFromStorage();
    syncConfigToUI();
    renderMessages();
    bindAllEvents();
  } catch (e) {
    console.error('Bootstrap failed:', e);
    if (DomRefs.statusSpan) DomRefs.statusSpan.innerText = '启动失败: ' + (e.message || e);
  }
}

bootstrapApp();

})();
