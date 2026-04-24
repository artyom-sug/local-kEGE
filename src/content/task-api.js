window.KT_TASK_API = {
  metaCache: new Map(),

  async loadTaskMeta(taskId) {
    const cacheKey = KT_UTILS.safeText(taskId).trim();

    if (!cacheKey) {
      return this.getFallbackTaskMeta(taskId);
    }

    if (!this.metaCache.has(cacheKey)) {
      this.metaCache.set(cacheKey, this.fetchTaskMeta(cacheKey));
    }

    return await this.metaCache.get(cacheKey);
  },

  async fetchTaskMeta(taskId) {
    try {
      const response = await fetch(`https://kompege.ru/api/v1/task/${taskId}`);

      if (!response.ok) {
        throw new Error(`Task API error: ${response.status}`);
      }

      const data = await response.json();

      return this.normalizeTaskMeta(data, taskId);
    } catch (error) {
      console.error("[KT] loadTaskMeta error:", error);
      this.metaCache.delete(KT_UTILS.safeText(taskId).trim());
      return this.getFallbackTaskMeta(taskId);
    }
  },

  normalizeTaskMeta(data, fallbackTaskId) {
    const entries = [];
    const seenKeys = new Set();
    const difficulty = data?.difficulty ?? null;

    const pushEntry = (source) => {
      const number = KT_UTILS.toPositiveInt(source?.number);
      const taskId = KT_UTILS.safeText(
        source?.taskId ?? data?.taskId ?? fallbackTaskId
      ).trim();

      if (number === null || !taskId) {
        return;
      }

      const key = KT_UTILS.buildTaskProgressKey(taskId, number);
      if (!key || seenKeys.has(key)) {
        return;
      }

      seenKeys.add(key);
      entries.push({
        number,
        taskId,
        difficulty
      });
    };

    pushEntry(data);

    if (Array.isArray(data?.subTask)) {
      data.subTask.forEach((subTask) => {
        pushEntry(subTask);
      });
    }

    entries.sort((a, b) => a.number - b.number);

    return {
      taskId:
        KT_UTILS.safeText(data?.taskId ?? fallbackTaskId).trim() ||
        KT_UTILS.safeText(fallbackTaskId).trim(),
      difficulty,
      primaryNumber: KT_UTILS.toPositiveInt(data?.number),
      entries
    };
  },

  getFallbackTaskMeta(taskId) {
    return {
      taskId: KT_UTILS.safeText(taskId).trim(),
      difficulty: null,
      primaryNumber: null,
      entries: []
    };
  },

  async loadKimVariant(kimNumber) {
    try {
      const response = await fetch(
        `https://kompege.ru/api/v1/variant/kim/${kimNumber}`
      );

      if (!response.ok) {
        throw new Error(`Variant API error: ${response.status}`);
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("[KT] loadKimVariant error:", error);
      return null;
    }
  }
};
