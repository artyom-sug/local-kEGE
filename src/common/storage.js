window.KT_STORAGE = {
    async getSettings() {
      const data = await chrome.storage.sync.get(
        window.KT_CONSTANTS.STORAGE_KEYS.SETTINGS
      );
  
      return {
        ...window.KT_CONSTANTS.DEFAULT_SETTINGS,
        ...(data[window.KT_CONSTANTS.STORAGE_KEYS.SETTINGS] || {})
      };
    },
  
    async getArea() {
      const settings = await this.getSettings();
      const areaName = settings.storageArea || window.KT_CONSTANTS.STORAGE_AREAS.SYNC;
      return chrome.storage[areaName];
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
      return await this.get(window.KT_CONSTANTS.STORAGE_KEYS.TASKS, {});
    },
  
    async setTasks(tasks) {
      await this.set({
        [window.KT_CONSTANTS.STORAGE_KEYS.TASKS]: tasks
      });
    },
  
    async updateTask(taskId, updater) {
      const tasks = await this.getTasks();
      const prevTask = tasks[taskId] || {};
      const nextTask = updater(prevTask);
  
      tasks[taskId] = nextTask;
      await this.setTasks(tasks);
  
      return nextTask;
    }
  };
  