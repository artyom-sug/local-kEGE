window.KT_UTILS = {
    safeText(value) {
      return value == null ? "" : String(value);
    },
  
    nowIso() {
      return new Date().toISOString();
    },
  
    openExtensionStatsPage() {
      window.open(chrome.runtime.getURL("src/stats/stats.html"), "_blank");
    }
  };
  