window.KT_MENU = {
  injected: false,
  originalContent: null,
  originalTitle: null,
  footerElement: null,

  injectStatsMenuItem() {
    if (this.injected) return;

    const navWrap = document.querySelector(".nav-wrap");
    if (!navWrap) return;

    if (navWrap.querySelector('[data-kt-menu="progress"]')) {
      this.injected = true;
      return;
    }

    const existingItem = navWrap.querySelector("p");
    if (!existingItem) return;

    const item = existingItem.cloneNode(true);
    item.textContent = "Мой прогресс";
    item.setAttribute("data-kt-menu", "progress");

    const newItem = item.cloneNode(true);

    newItem.addEventListener("click", () => {
      this.openStatsPage();
    });

    navWrap.appendChild(newItem);

    this.injected = true;
  },

  removeStatsMenuItem() {
    const item = document.querySelector('[data-kt-menu="progress"]');
    if (item) {
      item.remove();
    }

    if (this.isStatsPageOpen()) {
      this.restoreMainPage();
    }

    this.injected = false;
  },

  isStatsPageOpen() {
    return Boolean(document.querySelector(".kt-stats"));
  },

  openStatsPage() {
    const main = document.querySelector(".main");
    const title = document.querySelector(".title h1");
    const footer = document.querySelector(".footer");

    if (!main || !title) return;

    if (!this.originalContent) {
      this.originalContent = main.innerHTML;
      this.originalTitle = title.textContent;
      this.footerElement = footer;
    }

    if (footer) {
      footer.style.display = "none";
    }

    title.textContent = "Мой прогресс и статистика";

    main.innerHTML = `
      <div class="kt-stats">
        <div class="kt-block">
          <div class="kt-actions">
            <button id="kt-export-backup" type="button">Экспорт данных</button>
            <button id="kt-import-backup" type="button">Импорт данных</button>
            <input
              id="kt-import-file"
              type="file"
              accept="application/json,.json"
              hidden
            />
          </div>
          <div class="kt-hint">
            JSON сохранит прогресс для переноса и восстановления.
          </div>
          <div id="kt-transfer-status" class="kt-status" data-tone="muted">
            Бэкап можно хранить отдельно от браузера и загружать обратно при
            необходимости.
          </div>
        </div>

        <div class="kt-block">
          <div class="kt-metric" id="kt-total"></div>
          <div class="kt-recent" id="kt-recent"></div>
        </div>

        <div class="kt-block kt-center kt-pie-block">
          <canvas id="kt-pie" width="260" height="260"></canvas>
          <div id="kt-pie-legend" class="kt-legend"></div>
        </div>

        <div class="kt-block kt-center">
          <canvas id="kt-bar" width="800" height="320"></canvas>
        </div>

        <button id="kt-back" type="button">На главную</button>
      </div>
    `;

    this.bindStatsActions();
    this.renderStats();
  },

  bindStatsActions() {
    const exportBackupButton = document.getElementById("kt-export-backup");
    const importBackupButton = document.getElementById("kt-import-backup");
    const importFileInput = document.getElementById("kt-import-file");
    const backButton = document.getElementById("kt-back");

    if (exportBackupButton) {
      exportBackupButton.addEventListener("click", () => {
        this.exportBackup();
      });
    }

    if (importBackupButton && importFileInput) {
      importBackupButton.addEventListener("click", () => {
        importFileInput.value = "";
        importFileInput.click();
      });

      importFileInput.addEventListener("change", (event) => {
        this.handleImportFileChange(event);
      });
    }

    if (backButton) {
      backButton.addEventListener("click", () => {
        this.restoreMainPage();
      });
    }
  },

  async renderStats() {
    const tasks = await KT_STORAGE.getTasks();
    const stats = buildStatsSnapshot(tasks);

    document.getElementById("kt-total").textContent =
      `Решено задач: ${stats.solvedCount}`;

    document.getElementById("kt-recent").textContent =
      "Последние: " +
      (stats.recentTasks.map((task) => task.label).join(", ") || "-");

    drawPieChart("kt-pie", stats.diffCount);
    renderLegend("kt-pie-legend", stats.diffCount);
    drawBarChart("kt-bar", stats.countsByNumber);
  },

  setTransferStatus(message, tone = "info") {
    const status = document.getElementById("kt-transfer-status");
    if (!status) return;

    status.textContent = message;
    status.setAttribute("data-tone", tone);
  },

  async exportBackup() {
    try {
      const backup = await KT_STORAGE.exportBackupData();
      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json;charset=utf-8" }
      );

      downloadBlob(
        blob,
        buildExportFileName("kompege-tracker-backup", "json")
      );

      this.setTransferStatus(
        `Файл с прогрессом сохранён: ${Object.keys(backup.tasks).length} задач.`,
        "success"
      );
    } catch (error) {
      console.error("[kompege tracker] failed to export backup", error);
      this.setTransferStatus(
        "Не удалось сохранить JSON-файл с прогрессом.",
        "error"
      );
    }
  },

  async handleImportFileChange(event) {
    const file = event.target?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const rawText = await file.text();
      const backupData = JSON.parse(rawText);
      const currentTasks = await KT_STORAGE.getTasks();
      const importCount = getBackupTaskCount(backupData);
      const shouldImport = window.confirm(
        `Импорт заменит текущий прогресс (${Object.keys(currentTasks).length} задач) данными из файла (${importCount} задач). Продолжить?`
      );

      if (!shouldImport) {
        this.setTransferStatus("Импорт отменён.", "muted");
        return;
      }

      const result = await KT_STORAGE.importBackupData(backupData);

      await this.renderStats();

      this.setTransferStatus(
        `Импорт завершён: ${result.importedCount} задач восстановлено.`,
        "success"
      );
    } catch (error) {
      console.error("[kompege tracker] failed to import backup", error);
      this.setTransferStatus(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить файл с прогрессом.",
        "error"
      );
    } finally {
      event.target.value = "";
    }
  },

  restoreMainPage() {
    const main = document.querySelector(".main");
    const title = document.querySelector(".title h1");

    if (!main || !title || !this.originalContent) return;

    main.innerHTML = this.originalContent;
    title.textContent = this.originalTitle;

    if (this.footerElement) {
      this.footerElement.style.display = "";
    }
  }
};

function buildStatsSnapshot(tasks) {
  const entries = Object.entries(tasks || {});
  const solvedEntries = entries
    .filter(([, task]) => task?.solved)
    .map(([taskKey, task]) => ({
      taskKey,
      task,
      label: KT_UTILS.formatTaskLabel(task, taskKey),
      updatedAtTime: getUpdatedAtTime(task?.updatedAt),
      updatedAtLabel: formatDateTime(task?.updatedAt)
    }))
    .sort((left, right) => right.updatedAtTime - left.updatedAtTime);

  const diffMap = {
    0: "Базовый",
    1: "Средний",
    2: "Сложный",
    3: "Гроб"
  };

  const diffCount = {};

  for (const entry of solvedEntries) {
    const difficultyLabel = diffMap[entry.task.difficulty];

    if (difficultyLabel !== undefined) {
      diffCount[difficultyLabel] = (diffCount[difficultyLabel] || 0) + 1;
    }
  }

  const countsByNumber = {};

  for (let number = 1; number <= 27; number += 1) {
    countsByNumber[number] = 0;
  }

  for (const entry of solvedEntries) {
    const taskNumber = KT_UTILS.toPositiveInt(entry.task.number);

    if (taskNumber === null) {
      continue;
    }

    if (countsByNumber[taskNumber] === undefined) {
      countsByNumber[taskNumber] = 0;
    }

    countsByNumber[taskNumber] = (countsByNumber[taskNumber] || 0) + 1;
  }

  return {
    solvedCount: solvedEntries.length,
    recentTasks: solvedEntries.slice(0, 10),
    diffCount,
    countsByNumber,
    exportedAtLabel: formatDateTime(KT_UTILS.nowIso())
  };
}

function getUpdatedAtTime(updatedAt) {
  const timestamp = Date.parse(updatedAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDateTime(value) {
  const timestamp = Date.parse(value || "");

  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("ru-RU");
}

function buildExportFileName(prefix, extension) {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0")
  ];

  return `${prefix}-${parts.join("-")}.${extension}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function getBackupTaskCount(backupData) {
  const rawTasks =
    backupData?.tasks ??
    backupData?.progress ??
    backupData?.[window.KT_CONSTANTS.STORAGE_KEYS.TASKS];

  if (!rawTasks || typeof rawTasks !== "object" || Array.isArray(rawTasks)) {
    return 0;
  }

  return Object.keys(rawTasks).length;
}

function drawPieChart(canvasId, data) {
  const canvas = resolveCanvas(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.max(
    12,
    Math.min(canvas.width, canvas.height) / 2 - 20
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!total) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = `${Math.max(16, Math.round(canvas.width / 16))}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Нет данных", centerX, centerY);
    return;
  }

  let start = 0;
  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

  Object.entries(data).forEach(([, value], index) => {
    const angle = (value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();

    start += angle;
  });
}

function renderLegend(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

  Object.entries(data).forEach(([label, value], index) => {
    const row = document.createElement("div");
    row.className = "kt-legend-item";

    row.innerHTML = `
      <span class="kt-color" style="background:${colors[index]}"></span>
      ${label} - ${value}
    `;

    container.appendChild(row);
  });

  if (!Object.keys(data).length) {
    const row = document.createElement("div");
    row.className = "kt-legend-item";
    row.textContent = "Нет данных";
    container.appendChild(row);
  }
}

function drawBarChart(canvasId, data) {
  const canvas = resolveCanvas(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const entries = Object.entries(data)
    .map(([key, value]) => [Number(key), value])
    .sort((left, right) => left[0] - right[0]);

  const max = Math.max(...entries.map((entry) => entry[1]), 1);

  const leftPad = 14;
  const rightPad = 14;
  const topPad = 28;
  const bottomPad = 28;
  const chartHeight = canvas.height - topPad - bottomPad;
  const chartWidth = canvas.width - leftPad - rightPad;
  const barWidth = chartWidth / entries.length;
  const valueFontSize = Math.max(10, Math.min(14, Math.round(canvas.width / 72)));
  const numberFontSize = Math.max(10, Math.min(13, Math.round(canvas.width / 82)));

  entries.forEach(([number, value], index) => {
    const height = value > 0 ? (value / max) * chartHeight : 0;
    const x = leftPad + index * barWidth;
    const y = topPad + (chartHeight - height);

    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(x + 2, y, Math.max(barWidth - 4, 2), height);

    ctx.fillStyle = "#e5e7eb";
    ctx.font = `${valueFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(String(value), x + barWidth / 2, y - 4);
    ctx.font = `${numberFontSize}px Arial`;
    ctx.fillText(String(number), x + barWidth / 2, canvas.height - 8);
  });
}

function resolveCanvas(value) {
  if (typeof value === "string") {
    return document.getElementById(value);
  }

  return value || null;
}
