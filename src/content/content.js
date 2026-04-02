(function initKompegeTracker() {
  if (window.location.pathname !== "/task") {
    return;
  }

  console.log("[kompege tracker] task page loaded");

  scanTasks();
  KT_OBSERVER.start(scanTasks);
})();

async function scanTasks() {
  const detailsNodes = document.querySelectorAll("#app span.details");

  for (const detailsElement of detailsNodes) {
    const taskId = extractTaskId(detailsElement);

    if (!taskId) continue;

    if (KT_TASK_DOM.hasToggle(detailsElement, taskId)) continue;

    await KT_TASK_DOM.mountToggleNearTask(detailsElement, taskId);
  }
}

function extractTaskId(detailsElement) {
  const text = detailsElement.textContent || "";
  const match = text.match(/№\s*(\d+)/);

  return match ? match[1] : null;
}