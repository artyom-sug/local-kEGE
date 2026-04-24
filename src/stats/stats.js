(async function initStatsPage() {
  const tasks = await KT_STORAGE.getTasks();
  const entries = Object.entries(tasks);

  const totalCount = entries.length;
  const solvedCount = entries.filter(([, task]) => task.solved).length;

  document.getElementById("total-count").textContent = String(totalCount);
  document.getElementById("solved-count").textContent = String(solvedCount);

  renderGrouped(
    "by-type",
    groupBy(entries, ([, task]) => task.type || "Неизвестно")
  );

  renderGrouped(
    "by-difficulty",
    groupBy(entries, ([, task]) => task.difficulty ?? "Неизвестно")
  );

  renderRecent(entries);
})();

function groupBy(entries, keyGetter) {
  const result = {};

  for (const entry of entries) {
    const key = keyGetter(entry);
    result[key] = (result[key] || 0) + 1;
  }

  return result;
}

function renderGrouped(containerId, grouped) {
  const container = document.getElementById(containerId);
  const items = Object.entries(grouped);

  if (!items.length) {
    container.textContent = "Пока нет данных";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "list";

  items
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.textContent = `${key}: ${count}`;
      wrapper.appendChild(item);
    });

  container.innerHTML = "";
  container.appendChild(wrapper);
}

function renderRecent(entries) {
  const container = document.getElementById("recent-list");

  if (!entries.length) {
    container.textContent = "Пока нет данных";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "list";

  entries
    .filter(([, task]) => task.updatedAt)
    .sort((a, b) => {
      return new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime();
    })
    .slice(0, 10)
    .forEach(([taskKey, task]) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.textContent =
        `${KT_UTILS.formatTaskLabel(task, taskKey)} — ` +
        `${task.solved ? "решена" : "не решена"}`;
      wrapper.appendChild(item);
    });

  container.innerHTML = "";
  container.appendChild(wrapper);
}
