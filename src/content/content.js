const KT_IMPORTED_KIMS = new Set();

(function initKompegeTracker() {
  console.log("[kompege tracker] loaded");

  setupStorageListener();
  bootstrap();
})();

async function bootstrap() {
  const enabled = await KT_STORAGE.isEnabled();

  if (!enabled) {
    disableUi();
    return;
  }

  waitForMenuAndInject();
  handleDynamicPage();

  KT_OBSERVER.start(() => {
    handleIfEnabled();
  });

  KT_VARIANT_WATCHER.start();
  KT_COURSE_WATCHER.start();
}

async function handleIfEnabled() {
  const enabled = await KT_STORAGE.isEnabled();

  if (!enabled) {
    disableUi();
    return;
  }

  waitForMenuAndInject();
  handleDynamicPage();
}

function setupStorageListener() {
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "sync") return;

    const settingsKey = KT_CONSTANTS.STORAGE_KEYS.SETTINGS;
    if (!changes[settingsKey]) return;

    const enabled = await KT_STORAGE.isEnabled();

    if (enabled) {
      waitForMenuAndInject();
      await handleDynamicPage();
    } else {
      disableUi();
    }
  });
}

function disableUi() {
  KT_TASK_DOM.removeAllToggles();
  KT_MENU.removeStatsMenuItem();
}

function waitForMenuAndInject() {
  const nav = document.querySelector(".nav-wrap");
  if (nav) {
    KT_MENU.injectStatsMenuItem();
  }
}

async function handleDynamicPage() {
  const path = window.location.pathname;

  if (path === "/task") {
    await scanArchiveTasks();
  }

  if (path === "/variant") {
    await scanVariantTasks();
  }

  if (path === "/course" || path === "/homework") {
    await scanCourseLikeTask();
  }

  await tryImportKimResults();
}

async function scanArchiveTasks() {
  const nodes = document.querySelectorAll("#app span.details");

  for (const el of nodes) {
    const taskId = extractTaskId(el.textContent || "");
    if (!taskId) continue;

    const taskContext = KT_TASK_STATE.createTaskContext({
      taskId,
      number: extractArchivePrimaryNumber(el),
      relatedNumbers: extractArchiveRelatedNumbers(el)
    });

    await KT_TASK_DOM.mountOrUpdateToggle(el, taskContext);
  }
}

async function scanVariantTasks() {
  const nodes = document.querySelectorAll("#app .task .text .text-bolder");

  for (const el of nodes) {
    const taskContext = extractTaskContextFromTitle(el);
    if (!taskContext) continue;

    await KT_TASK_DOM.mountOrUpdateToggle(el, taskContext);
  }
}

async function scanCourseLikeTask() {
  const title = document.querySelector("#app .task .text .text-bolder");
  if (!title) return;

  const taskContext = extractTaskContextFromTitle(title);
  if (!taskContext) return;

  await KT_TASK_DOM.mountOrUpdateToggle(title, taskContext);
  await applyCourseLikeState(title, taskContext);
}

async function applyCourseLikeState(titleElement, taskContext) {
  const current = document.querySelector("#navTasks .block.task-current");
  if (!current) return;

  const isSolved = current.classList.contains("task-good");

  if (isSolved) {
    await KT_TASK_STATE.setSolvedForContext(taskContext, true);
  }

  const toggle = titleElement.querySelector(
    `[data-kt-toggle-for="${taskContext.key}"]`
  );

  if (toggle) {
    await KT_TASK_DOM.syncToggleState(toggle, taskContext);
  }
}

const KT_VARIANT_WATCHER = {
  interval: null,
  lastTaskKey: null,

  start() {
    if (this.interval) return;

    this.interval = setInterval(async () => {
      const enabled = await KT_STORAGE.isEnabled();
      if (!enabled) return;

      if (window.location.pathname !== "/variant") return;

      const title = document.querySelector("#app .task .text .text-bolder");
      if (!title) return;

      const taskContext = extractTaskContextFromTitle(title);
      if (!taskContext) return;

      if (taskContext.key !== this.lastTaskKey) {
        this.lastTaskKey = taskContext.key;
        await KT_TASK_DOM.mountOrUpdateToggle(title, taskContext);
      }
    }, 250);
  }
};

const KT_COURSE_WATCHER = {
  interval: null,
  lastTaskKey: null,

  start() {
    if (this.interval) return;

    this.interval = setInterval(async () => {
      const enabled = await KT_STORAGE.isEnabled();
      if (!enabled) return;

      const path = window.location.pathname;

      if (path !== "/course" && path !== "/homework") return;

      const title = document.querySelector("#app .task .text .text-bolder");
      if (!title) return;

      const taskContext = extractTaskContextFromTitle(title);
      if (!taskContext) return;

      if (taskContext.key !== this.lastTaskKey) {
        this.lastTaskKey = taskContext.key;
        await KT_TASK_DOM.mountOrUpdateToggle(title, taskContext);
      }

      await applyCourseLikeState(title, taskContext);
    }, 300);
  }
};

function extractTaskId(text) {
  const match = text.match(/№\s*(\d+)/);
  return match ? match[1] : null;
}

function extractExamNumber(text) {
  const match = text.match(/Задание\s*(\d+)/i);
  return match ? KT_UTILS.toPositiveInt(match[1]) : null;
}

function extractTaskContextFromTitle(titleElement) {
  return KT_TASK_STATE.createTaskContext({
    taskId: extractTaskId(titleElement?.textContent || ""),
    number: extractExamNumber(titleElement?.textContent || "")
  });
}

function extractArchivePrimaryNumber(detailsElement) {
  const row = detailsElement?.closest("tr");
  const numberText = row?.querySelector(".number")?.textContent || "";
  return KT_UTILS.toPositiveInt(numberText);
}

function extractArchiveRelatedNumbers(detailsElement) {
  const row = detailsElement?.closest("tr");

  if (!row) {
    return [];
  }

  const numbers = [];
  const primaryNumber = extractArchivePrimaryNumber(detailsElement);

  if (primaryNumber !== null) {
    numbers.push(primaryNumber);
  }

  row.querySelectorAll("b").forEach((node) => {
    const match = (node.textContent || "").match(/Задание\s*(\d+)/i);

    if (match) {
      numbers.push(match[1]);
    }
  });

  return KT_UTILS.uniqueNumbers(numbers);
}

async function tryImportKimResults() {
  const kim = document.querySelector("p.kim");
  if (!kim) return;

  const kimNumber = extractKimNumber(kim.textContent || "");
  if (!kimNumber) return;

  if (KT_IMPORTED_KIMS.has(kimNumber)) return;

  const scoreRows = extractKimScoreRows();
  if (!scoreRows.length) return;

  const variantData = await KT_TASK_API.loadKimVariant(kimNumber);
  if (!variantData?.tasks?.length) return;

  await KT_TASK_STATE.importSolvedTasksFromKim(variantData, scoreRows);

  KT_IMPORTED_KIMS.add(kimNumber);
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
      if (cells.length < 2) return;

      if ((cells[0].textContent || "").trim() === "№") return;

      const score = Number((cells[1].textContent || "").trim());
      scores.push(Number.isFinite(score) ? score : 0);
    });
  });

  return scores;
}
