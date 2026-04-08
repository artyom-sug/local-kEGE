const KT_IMPORTED_KIMS = new Set();

// ================= INIT =================
(function initKompegeTracker() {
  console.log("[kompege tracker] loaded");

  waitForMenuAndInject();
  handleDynamicPage();

  KT_OBSERVER.start(() => {
    waitForMenuAndInject();
    handleDynamicPage();
  });

  KT_VARIANT_WATCHER.start();
  KT_COURSE_WATCHER.start();
})();

// ================= MENU =================
function waitForMenuAndInject() {
  const nav = document.querySelector(".nav-wrap");
  if (nav) {
    KT_MENU.injectStatsMenuItem();
  }
}

// ================= MAIN ROUTER =================
async function handleDynamicPage() {
  if (window.location.pathname === "/task") {
    await scanArchiveTasks();
  }

  if (window.location.pathname === "/variant") {
    await scanVariantTasks();
  }

  if (window.location.pathname === "/course") {
    await scanCourseTask();
  }

  await tryImportKimResults();
}

// ================= ARCHIVE =================
async function scanArchiveTasks() {
  const nodes = document.querySelectorAll("#app span.details");

  for (const el of nodes) {
    const taskId = extractNumber(el.textContent || "");
    if (!taskId) continue;

    await KT_TASK_DOM.mountOrUpdateToggle(el, taskId);
  }
}

// ================= VARIANT =================
async function scanVariantTasks() {
  const nodes = document.querySelectorAll("#app .task .text .text-bolder");

  for (const el of nodes) {
    const taskId = extractNumber(el.textContent || "");
    if (!taskId) continue;

    await KT_TASK_DOM.mountOrUpdateToggle(el, taskId);
  }
}

// ================= COURSE =================
async function scanCourseTask() {
  const title = document.querySelector("#app .task .text .text-bolder");
  if (!title) return;

  const taskId = extractNumber(title.textContent || "");
  if (!taskId) return;

  await KT_TASK_DOM.mountOrUpdateToggle(title, taskId);
  await applyCourseState(title, taskId);
}

async function applyCourseState(titleElement, taskId) {
  const current = document.querySelector("#navTasks .block.task-current");
  if (!current) return;

  const isSolved = current.classList.contains("task-good");

  // обновляем storage
  if (isSolved) {
    await KT_TASK_STATE.setSolved(taskId, true);
  }

  // 🔥 ВАЖНО: обновляем UI тумблера
  const toggle = titleElement.querySelector(`[data-kt-toggle-for="${taskId}"]`);

  if (toggle) {
    const input = toggle.querySelector("input");

    if (input && isSolved) {
      input.checked = true;
    }
  }
}

// ================= WATCHERS =================

// --- VARIANT ---
const KT_VARIANT_WATCHER = {
  interval: null,
  lastTaskId: null,

  start() {
    if (this.interval) return;

    this.interval = setInterval(async () => {
      if (window.location.pathname !== "/variant") return;

      const title = document.querySelector("#app .task .text .text-bolder");
      if (!title) return;

      const taskId = extractNumber(title.textContent || "");
      if (!taskId) return;

      if (taskId !== this.lastTaskId) {
        this.lastTaskId = taskId;

        await KT_TASK_DOM.mountOrUpdateToggle(title, taskId);
      }
    }, 250);
  }
};

// --- COURSE ---
const KT_COURSE_WATCHER = {
  interval: null,
  lastTaskId: null,

  start() {
    if (this.interval) return;

    this.interval = setInterval(async () => {
      if (window.location.pathname !== "/course") return;

      const title = document.querySelector("#app .task .text .text-bolder");
      if (!title) return;

      const taskId = extractNumber(title.textContent || "");
      if (!taskId) return;

      if (taskId !== this.lastTaskId) {
        this.lastTaskId = taskId;

        await KT_TASK_DOM.mountOrUpdateToggle(title, taskId);
      }

      await applyCourseState(title, taskId);
    }, 300);
  }
};

// ================= COMMON =================
function extractNumber(text) {
  const match = text.match(/№\s*(\d+)/);
  return match ? match[1] : null;
}

// ================= KIM =================
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
