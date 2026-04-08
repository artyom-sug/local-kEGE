const KT_IMPORTED_KIMS = new Set();

(function initKompegeTracker() {
  console.log("[kompege tracker] loaded");

  waitForMenuAndInject();
  handleDynamicPage();

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
    await scanTasks();
  }

  await tryImportKimResults();
}

async function scanTasks() {
  const detailsNodes = document.querySelectorAll("#app span.details");

  for (const detailsElement of detailsNodes) {
    const taskId = extractTaskId(detailsElement);

    if (!taskId) {
      continue;
    }

    if (KT_TASK_DOM.hasToggle(detailsElement, taskId)) {
      continue;
    }

    await KT_TASK_DOM.mountToggleNearTask(detailsElement, taskId);
  }
}

function extractTaskId(detailsElement) {
  const text = detailsElement.textContent || "";
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

  if (!variantData || !Array.isArray(variantData.tasks) || !variantData.tasks.length) {
    return;
  }

  await KT_TASK_STATE.importSolvedTasksFromKim(variantData, scoreRows);

  KT_IMPORTED_KIMS.add(kimNumber);
  console.log("[kompege tracker] imported solved tasks from KIM", kimNumber);
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

      const firstCellText = (cells[0].textContent || "").trim();
      if (firstCellText === "№") {
        return;
      }

      const scoreText = (cells[1].textContent || "").trim();
      const score = Number(scoreText);

      scores.push(Number.isFinite(score) ? score : 0);
    });
  });

  return scores;
}
