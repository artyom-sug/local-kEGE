(function initKompegeTracker() {
  console.log("[kompege tracker] loaded");

  waitForMenuAndInject();

  if (window.location.pathname !== "/task") {
    return;
  }

  scanTasks();
  KT_OBSERVER.start(scanTasks);
})();

function waitForMenuAndInject() {
  const interval = setInterval(() => {
    const nav = document.querySelector(".nav-wrap");

    if (nav) {
      KT_MENU.injectStatsMenuItem();
      clearInterval(interval);
    }
  }, 300);
}

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