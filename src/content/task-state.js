window.KT_TASK_STATE = {
    async getTask(taskId) {
      const tasks = await KT_STORAGE.getTasks();
      return tasks[taskId] || null;
    },
  
    async setSolved(taskId, solved, extra = {}) {
      return await KT_STORAGE.updateTask(taskId, (prev) => ({
        ...prev,
        ...extra,
        solved,
        updatedAt: new Date().toISOString()
      }));
    }
  };
  