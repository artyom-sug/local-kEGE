window.KT_STORAGE = {
  TASK_SHARD_COUNT: 32,

  async getSettings() {
    const data = await chrome.storage.sync.get(
      window.KT_CONSTANTS.STORAGE_KEYS.SETTINGS
    );

    return {
      ...window.KT_CONSTANTS.DEFAULT_SETTINGS,
      ...(data[window.KT_CONSTANTS.STORAGE_KEYS.SETTINGS] || {})
    };
  },

  async setSettings(nextSettings) {
    const current = await this.getSettings();

    await chrome.storage.sync.set({
      [window.KT_CONSTANTS.STORAGE_KEYS.SETTINGS]: {
        ...current,
        ...nextSettings
      }
    });
  },

  async isEnabled() {
    const settings = await this.getSettings();
    return settings.extensionEnabled !== false;
  },

  async setEnabled(enabled) {
    await this.setSettings({
      extensionEnabled: Boolean(enabled)
    });
  },

  async getArea() {
    const settings = await this.getSettings();
    const areaName =
      settings.storageArea || window.KT_CONSTANTS.STORAGE_AREAS.SYNC;
    return chrome.storage[areaName];
  },

  async getTaskArea() {
    return await this.getArea();
  },

  async get(key, fallback = null) {
    const area = await this.getArea();
    const data = await area.get(key);

    if (data[key] === undefined) {
      return fallback;
    }

    return data[key];
  },

  async set(obj) {
    const area = await this.getArea();
    await area.set(obj);
  },

  async remove(key) {
    const area = await this.getArea();
    await area.remove(key);
  },

  async getTasks() {
    const taskArea = await this.getTaskArea();
    const primaryLoad = await this.loadTasksFromArea(taskArea);

    if (primaryLoad.tasks !== null) {
      const migratedPrimaryTasks = this.migrateTasksMap(primaryLoad.tasks);

      if (primaryLoad.source !== "shards" || migratedPrimaryTasks.changed) {
        await this.setTasks(migratedPrimaryTasks.tasks);
      }

      return migratedPrimaryTasks.tasks;
    }

    for (const fallbackArea of this.getFallbackTaskAreas(taskArea)) {
      const fallbackLoad = await this.loadTasksFromArea(fallbackArea);

      if (fallbackLoad.tasks === null) {
        continue;
      }

      const migratedFallbackTasks = this.migrateTasksMap(fallbackLoad.tasks);
      await this.setTasks(migratedFallbackTasks.tasks);
      return migratedFallbackTasks.tasks;
    }

    return {};
  },

  async setTasks(tasks) {
    const area = await this.getTaskArea();
    const shards = this.partitionTasksByShard(tasks);
    const payload = {};
    const emptyShardKeys = [];

    for (const shardKey of this.getAllTaskShardKeys()) {
      const shardTasks = shards[shardKey];

      if (Object.keys(shardTasks).length) {
        payload[shardKey] = shardTasks;
      } else {
        emptyShardKeys.push(shardKey);
      }
    }

    if (Object.keys(payload).length) {
      await area.set(payload);
    }

    if (emptyShardKeys.length) {
      await area.remove(emptyShardKeys);
    }

    await area.remove(window.KT_CONSTANTS.STORAGE_KEYS.TASKS);
  },

  async exportBackupData() {
    return {
      format: "kompege-tracker-backup",
      schemaVersion: 1,
      exportedAt: KT_UTILS.nowIso(),
      appVersion: window.KT_CONSTANTS.VERSION,
      settings: await this.getSettings(),
      tasks: await this.getTasks()
    };
  },

  async importBackupData(backupData) {
    const normalizedBackup = await this.normalizeBackupData(backupData);
    const currentSettings = await this.getSettings();

    await this.setTasks(normalizedBackup.tasks);
    await this.setSettings(
      this.sanitizeImportedSettings(
        normalizedBackup.settings,
        currentSettings
      )
    );

    return {
      importedCount: Object.keys(normalizedBackup.tasks).length,
      exportedAt: normalizedBackup.exportedAt
    };
  },

  async updateTask(taskKey, updater) {
    await this.getTasks();

    const area = await this.getTaskArea();
    const shardKey = this.getTaskShardKey(taskKey);
    const data = await area.get(shardKey);
    const shard = this.normalizeShard(data[shardKey]);
    const prevTask = shard[taskKey] || {};
    const nextTask = updater(prevTask);

    if (this.shouldPersistTask(nextTask)) {
      shard[taskKey] = this.normalizeTaskRecord(nextTask);
    } else {
      delete shard[taskKey];
    }

    if (Object.keys(shard).length) {
      await area.set({
        [shardKey]: shard
      });
    } else {
      await area.remove(shardKey);
    }

    return nextTask;
  },

  getAllTaskShardKeys() {
    return Array.from(
      { length: this.TASK_SHARD_COUNT },
      (_, index) => `${window.KT_CONSTANTS.STORAGE_KEYS.TASKS}_shard_${index}`
    );
  },

  getTaskShardKey(taskKey) {
    const key = String(taskKey || "");
    let hash = 0;

    for (let index = 0; index < key.length; index += 1) {
      hash = (hash * 31 + key.charCodeAt(index)) % this.TASK_SHARD_COUNT;
    }

    return `${window.KT_CONSTANTS.STORAGE_KEYS.TASKS}_shard_${hash}`;
  },

  async loadTasksFromArea(area) {
    const shardKeys = this.getAllTaskShardKeys();
    const shardData = await area.get(shardKeys);
    const tasksFromShards = this.flattenShards(shardData);

    if (Object.keys(tasksFromShards).length) {
      return {
        source: "shards",
        tasks: tasksFromShards
      };
    }

    const legacyKey = window.KT_CONSTANTS.STORAGE_KEYS.TASKS;
    const legacyData = await area.get(legacyKey);

    if (legacyData[legacyKey] !== undefined) {
      return {
        source: "legacy",
        tasks: legacyData[legacyKey] || {}
      };
    }

    return {
      source: null,
      tasks: null
    };
  },

  getFallbackTaskAreas(primaryArea) {
    const areas = [];

    if (primaryArea !== chrome.storage.sync) {
      areas.push(chrome.storage.sync);
    }

    if (primaryArea !== chrome.storage.local) {
      areas.push(chrome.storage.local);
    }

    return areas;
  },

  flattenShards(shardData) {
    const tasks = {};

    for (const shardKey of this.getAllTaskShardKeys()) {
      const shard = this.normalizeShard(shardData[shardKey]);

      Object.assign(tasks, shard);
    }

    return tasks;
  },

  partitionTasksByShard(tasks) {
    const shards = Object.fromEntries(
      this.getAllTaskShardKeys().map((shardKey) => [shardKey, {}])
    );

    for (const [taskKey, task] of Object.entries(tasks || {})) {
      if (!this.shouldPersistTask(task)) {
        continue;
      }

      const shardKey = this.getTaskShardKey(taskKey);
      shards[shardKey][taskKey] = this.normalizeTaskRecord(task);
    }

    return shards;
  },

  normalizeShard(shard) {
    return shard && typeof shard === "object" ? { ...shard } : {};
  },

  shouldPersistTask(task) {
    return Boolean(task && task.solved);
  },

  normalizeTaskRecord(task) {
    return {
      solved: true,
      taskId: task.taskId ?? null,
      number: task.number ?? null,
      difficulty: task.difficulty ?? null,
      updatedAt: task.updatedAt || null
    };
  },

  async normalizeBackupData(backupData) {
    if (!this.isPlainObject(backupData)) {
      throw new Error("Файл повреждён или имеет неверный формат.");
    }

    const rawTasks =
      backupData.tasks ??
      backupData.progress ??
      backupData[window.KT_CONSTANTS.STORAGE_KEYS.TASKS];

    if (!this.isPlainObject(rawTasks)) {
      throw new Error("В файле не найден прогресс задач.");
    }

    const migratedTasks = this.migrateTasksMap(
      this.sanitizeImportedTasksMap(rawTasks)
    );

    return {
      tasks: migratedTasks.tasks,
      settings: this.isPlainObject(backupData.settings)
        ? backupData.settings
        : {},
      exportedAt:
        typeof backupData.exportedAt === "string"
          ? backupData.exportedAt
          : null
    };
  },

  sanitizeImportedTasksMap(rawTasks) {
    const nextTasks = {};

    for (const [taskKey, task] of Object.entries(rawTasks || {})) {
      const normalizedTask = this.normalizeImportedTask(taskKey, task);

      if (!normalizedTask) {
        continue;
      }

      const normalizedKey = this.getNormalizedTaskKey(taskKey, normalizedTask);
      const previousTask = nextTasks[normalizedKey];

      if (!previousTask) {
        nextTasks[normalizedKey] = normalizedTask;
        continue;
      }

      nextTasks[normalizedKey] = this.mergeTaskRecords(
        previousTask,
        normalizedTask
      );
    }

    return nextTasks;
  },

  normalizeImportedTask(taskKey, task) {
    if (!this.isPlainObject(task)) {
      return null;
    }

    const parsedKey = KT_UTILS.parseTaskProgressKey(taskKey);
    const taskId = KT_UTILS.safeText(task.taskId ?? parsedKey.taskId).trim();
    const number = KT_UTILS.toPositiveInt(task.number ?? parsedKey.number);
    const normalizedTask = {
      solved: task.solved !== false,
      taskId: taskId || null,
      number,
      difficulty: this.normalizeDifficulty(task.difficulty),
      updatedAt: this.normalizeUpdatedAt(task.updatedAt)
    };

    if (!this.shouldPersistTask(normalizedTask)) {
      return null;
    }

    return normalizedTask;
  },

  sanitizeImportedSettings(nextSettings, currentSettings) {
    const current =
      currentSettings && typeof currentSettings === "object"
        ? currentSettings
        : window.KT_CONSTANTS.DEFAULT_SETTINGS;

    return {
      ...current,
      extensionEnabled:
        nextSettings?.extensionEnabled !== undefined
          ? Boolean(nextSettings.extensionEnabled)
          : current.extensionEnabled,
      // Хранилище не переключаем импортом, чтобы бэкап не менял среду.
      storageArea:
        current.storageArea ||
        window.KT_CONSTANTS.DEFAULT_SETTINGS.storageArea
    };
  },

  normalizeDifficulty(value) {
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  },

  normalizeUpdatedAt(value) {
    const timestamp =
      typeof value === "string" ? Date.parse(value) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return new Date(timestamp).toISOString();
  },

  isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  },

  migrateTasksMap(tasks) {
    const nextTasks = {};
    let changed = false;

    for (const [taskKey, task] of Object.entries(tasks || {})) {
      const normalizedTask =
        task && typeof task === "object" ? task : {};
      const normalizedKey = this.getNormalizedTaskKey(taskKey, normalizedTask);

      if (normalizedKey !== taskKey) {
        changed = true;
      }

      if (!nextTasks[normalizedKey]) {
        nextTasks[normalizedKey] = normalizedTask;
        continue;
      }

      nextTasks[normalizedKey] = this.mergeTaskRecords(
        nextTasks[normalizedKey],
        normalizedTask
      );
      changed = true;
    }

    return {
      changed,
      tasks: changed ? nextTasks : tasks
    };
  },

  getNormalizedTaskKey(taskKey, task) {
    if (String(taskKey).includes(":")) {
      return taskKey;
    }

    return (
      KT_UTILS.buildTaskProgressKey(taskKey, task?.number) || taskKey
    );
  },

  mergeTaskRecords(currentTask, incomingTask) {
    const currentUpdatedAt = this.getUpdatedAtTime(currentTask);
    const incomingUpdatedAt = this.getUpdatedAtTime(incomingTask);
    const latestTask =
      incomingUpdatedAt >= currentUpdatedAt ? incomingTask : currentTask;
    const fallbackTask =
      latestTask === incomingTask ? currentTask : incomingTask;

    return {
      ...fallbackTask,
      ...latestTask,
      taskId: latestTask.taskId ?? fallbackTask.taskId ?? null,
      number: latestTask.number ?? fallbackTask.number ?? null,
      difficulty:
        latestTask.difficulty ?? fallbackTask.difficulty ?? null,
      solved:
        latestTask.solved !== undefined
          ? latestTask.solved
          : fallbackTask.solved,
      updatedAt: latestTask.updatedAt || fallbackTask.updatedAt || null
    };
  },

  getUpdatedAtTime(task) {
    const timestamp = Date.parse(task?.updatedAt || "");
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
};
