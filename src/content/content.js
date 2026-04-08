const KT_IMPORTED_KIMS = new Set();

const KT_VARIANT_WATCHER = {
  intervalId: null,
  lastTaskId: null,

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = window.setInterval(async () => {
      if (window.location.pathname !== "/variant") {
        this.lastTaskId = null;
        return;
      }

      const titleElement = document.querySelector("#app .task .text .text-bolder");
      if (!titleElement) {
        this.lastTaskId = null;
        return;
      }

      const taskId = extractNumber(titleElement.textContent || "");
      if (!taskId) {
        this.lastTaskId = null;
        return;
      }

      if (taskId !== this.lastTaskId) {
        this.lastTaskId = taskId;
        await KT_TASK_DOM.mountOrUpdateToggle(titleElement, taskId);
      } else {
        const existingToggle = KT_TASK_DOM.getExistingToggle(titleElement);
        if (!existingToggle) {
          await KT_TASK_DOM.mountOrUpdateToggle(titleElement, taskId);
        }
      }
    }, 250);
  }
};

(function initKompegeTracker() {
  console.log("[kompege tracker] loaded");

  waitForMenuAndInject();
  handleDynamicPage();
  KT_VARIANT_WATCHER.start();

  KT_OBSERVER.start(() => {
    waitForMenuAndInject();
    handleDynamicPage();
  });
})();

function waitForMenuAndInject() {
  const nav = document.querySelector(".nav-wrap");

  if (nav) {
    KT_MENU.injectStatsMenuItem();
  }
}

async function handleDynamicPage() {
  if (window.location.pathname === "/task") {
    await scanArchiveTasks();
  }

  if (window.location.pathname === "/variant") {
    await scanVariantTasks();
  }

  await tryImportKimResults();
}

async function scanArchiveTasks() {
  const detailsNodes = document.querySelectorAll("#app span.details");

  for (const el of detailsNodes) {
    const taskId = extractNumber(el.textContent || "");
    if (!taskId) {
      continue;
    }

    await KT_TASK_DOM.mountOrUpdateToggle(el, taskId);
  }
}

async function scanVariantTasks() {
  const titleNodes = document.querySelectorAll("#app .task .text .text-bolder");

  for (const el of titleNodes) {
    const taskId = extractNumber(el.textContent || "");
    if (!taskId) {
      continue;
    }

    KT_VARIANT_WATCHER.lastTaskId = taskId;
    await KT_TASK_DOM.mountOrUpdateToggle(el, taskId);
  }
}

function extractNumber(text) {
  const match = text.match(/№\s*(\d+)/);
  return match ? match[1] : null;
}

async function tryImportKimResults() {
  const kimParagraph = document.querySelector("p.kim");
  if (!kimParagraph) {
    return;
  }

  const kimNumber = extractKimNumber(kimParagraph.textContent || "");
  if (!kimNumber) {
    return;
  }

  if (KT_IMPORTED_KIMS.has(kimNumber)) {
    return;
  }

  const scoreRows = extractKimScoreRows();
  if (!scoreRows.length) {
    return;
  }

  const variantData = await KT_TASK_API.loadKimVariant(kimNumber);
  if (!variantData?.tasks?.length) {
    return;
  }

  await KT_TASK_STATE.importSolvedTasksFromKim(variantData, scoreRows);

  KT_IMPORTED_KIMS.add(kimNumber);

  if (window.location.pathname === "/variant") {
    await scanVariantTasks();
  }
}

function extractKimNumber(text) {
  const match = text.match(/КИМ №\s*(\d+)/);
  return match ? match[1] : null;
}

function extractKimScoreRows() {
  const tables = document.querySelectorAll(".buttons table");
  const scores = [];

  tables.forEach((table) => {
    const rows = table.querySelectorAll("tr");

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");

      if (cells.length < 2) {
        return;
      }

      if ((cells[0].textContent || "").trim() === "№") {
        return;
      }

      const score = Number((cells[1].textContent || "").trim());
      scores.push(Number.isFinite(score) ? score : 0);
    });
  });

  return scores;
}
