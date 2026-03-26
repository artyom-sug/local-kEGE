(function initKompegeTracker() {
    if (window.location.pathname !== "/task") {
      return;
    }
  
    console.log("[kompege tracker] task page loaded");
  
    scanTasks();
    KT_OBSERVER.start(scanTasks);
  })();
  
  function scanTasks() {
    const detailsNodes = document.querySelectorAll("#app span.details");
  
    detailsNodes.forEach((detailsElement) => {
      const taskId = extractTaskId(detailsElement);
  
      if (!taskId) {
        return;
      }
  
      if (KT_TASK_DOM.hasToggle(detailsElement, taskId)) {
        return;
      }
  
      const toggleElement = KT_TASK_DOM.createToggle(taskId);
      KT_TASK_DOM.mountToggleNearTask(detailsElement, toggleElement);
    });
  }
  
  function extractTaskId(detailsElement) {
    const text = detailsElement.textContent || "";
    const match = text.match(/№\s*(\d+)/);
  
    return match ? match[1] : null;
  }
  