window.KT_MENU = {
  injected: false,
  originalContent: null,
  originalTitle: null,
  footerElement: null,

  injectStatsMenuItem() {
    if (this.injected) return;

    const navWrap = document.querySelector(".nav-wrap");
    if (!navWrap) return;

    const existingItem = navWrap.querySelector("p");
    if (!existingItem) return;

    const item = existingItem.cloneNode(true);
    item.textContent = "Мой прогресс";

    const newItem = item.cloneNode(true);

    newItem.addEventListener("click", () => {
      this.openStatsPage();
    });

    navWrap.appendChild(newItem);

    this.injected = true;
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

    if (footer) footer.style.display = "none";

    title.textContent = "Мой прогресс и статистика";

    main.innerHTML = `
      <div class="kt-stats">

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

        <button id="kt-back">На главную</button>
      </div>
    `;

    this.renderStats();

    document.getElementById("kt-back").onclick = () => {
      this.restoreMainPage();
    };
  },

  async renderStats() {
    const tasks = await KT_STORAGE.getTasks();
    const entries = Object.entries(tasks);

    const solvedTasks = entries.filter(([, t]) => t.solved);

    // ===== Мини-статистика =====
    document.getElementById("kt-total").textContent =
      `Решено задач: ${solvedTasks.length}`;

    const recent = solvedTasks
      .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))
      .slice(0, 10)
      .map(([id]) => id);

    document.getElementById("kt-recent").textContent =
      "Последние: " + (recent.join(", ") || "—");

    // ===== КРУГОВАЯ =====
    const diffMap = {
      0: "Базовый",
      1: "Средний",
      2: "Сложный",
      3: "Гроб"
    };

    const diffCount = {};

    for (const [, t] of solvedTasks) {
      const key = diffMap[t.difficulty] || "Неизвестно";
      diffCount[key] = (diffCount[key] || 0) + 1;
    }

    // Желаемый порядок категорий
    const order = ["Базовый", "Средний", "Сложный", "Гроб"];
    const orderedData = {};
    for (const key of order) {
      if (diffCount[key]) orderedData[key] = diffCount[key];
    }
    drawPieChart("kt-pie", orderedData);
    renderLegend("kt-pie-legend", orderedData);

    // ===== СТОЛБЧАТАЯ =====
    const counts = {};

    for (let i = 1; i <= 27; i++) counts[i] = 0;

    for (const [, t] of solvedTasks) {
      if (!t.number) continue;
      if (!counts[t.number]) counts[t.number] = 0;
      counts[t.number]++;
    }

    drawBarChart("kt-bar", counts);
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

// ===== PIE =====
function drawPieChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  let start = 0;

  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

  Object.entries(data).forEach(([_, value], i) => {
    const angle = (value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(130, 130);
    ctx.arc(130, 130, 110, start, start + angle);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    start += angle;
  });
}

// ===== LEGEND =====
function renderLegend(containerId, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

  Object.entries(data).forEach(([label, value], i) => {
    const row = document.createElement("div");
    row.className = "kt-legend-item";

    row.innerHTML = `
      <span class="kt-color" style="background:${colors[i]}"></span>
      ${label} — ${value}
    `;

    container.appendChild(row);
  });
}

// ===== BAR =====
function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  const entries = Object.entries(data)
    .map(([k, v]) => [Number(k), v])
    .sort((a, b) => a[0] - b[0]);

  const max = Math.max(...entries.map(e => e[1]), 1);

  const padding = 30;
  const height = canvas.height - padding * 2;
  const width = canvas.width;

  const barWidth = width / entries.length;

  // Очищаем холст перед отрисовкой
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = "10px Arial";
  ctx.textAlign = "center"; // центрируем текст по горизонтали

  entries.forEach(([num, val], i) => {
    const h = (val / max) * height;

    const x = i * barWidth;
    const y = canvas.height - h - padding; // верхняя граница столбика
    const centerX = x + barWidth / 2;      // центр столбика по X

    // Рисуем столбик
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(x + 2, y, barWidth - 4, h);

    ctx.fillStyle = "#e5e7eb";
    // Значение сверху (центрировано, над столбиком)
    if (val > 0) ctx.fillText(val, centerX, y - 4);

    // Номер снизу (центрировано, ближе к столбикам)
    // Основание столбика: canvas.height - padding
    // Подпись рисуем чуть ниже основания (отступ 12px)
    const labelY = canvas.height - padding + 12;
    ctx.fillText(num, centerX, labelY);
  });
}