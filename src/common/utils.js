window.KT_UTILS = {
  safeText(value) {
    return value == null ? "" : String(value);
  },

  nowIso() {
    return new Date().toISOString();
  },

  toPositiveInt(value) {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
      return null;
    }

    return number;
  },

  uniqueNumbers(values) {
    return Array.from(
      new Set(
        (Array.isArray(values) ? values : [])
          .map((value) => this.toPositiveInt(value))
          .filter((value) => value !== null)
      )
    ).sort((a, b) => a - b);
  },

  buildTaskProgressKey(taskId, number) {
    const normalizedTaskId = this.safeText(taskId).trim();
    const normalizedNumber = this.toPositiveInt(number);

    if (!normalizedTaskId) {
      return null;
    }

    if (normalizedNumber === null) {
      return normalizedTaskId;
    }

    return `${normalizedTaskId}:${normalizedNumber}`;
  },

  parseTaskProgressKey(key) {
    const value = this.safeText(key).trim();
    const match = value.match(/^(.+):(\d+)$/);

    if (match) {
      return {
        taskId: match[1],
        number: this.toPositiveInt(match[2])
      };
    }

    return {
      taskId: value,
      number: null
    };
  },

  formatTaskLabel(task, fallbackKey = "") {
    const parsedKey = this.parseTaskProgressKey(fallbackKey);
    const number = this.toPositiveInt(task?.number) ?? parsedKey.number;
    const taskId = this.safeText(task?.taskId ?? parsedKey.taskId).trim();

    if (number !== null && taskId) {
      return `${number} (№${taskId})`;
    }

    if (number !== null) {
      return `Задание ${number}`;
    }

    if (taskId) {
      return `№${taskId}`;
    }

    return fallbackKey || "Неизвестная задача";
  },

  openExtensionStatsPage() {
    window.open(chrome.runtime.getURL("src/stats/stats.html"), "_blank");
  }
};
