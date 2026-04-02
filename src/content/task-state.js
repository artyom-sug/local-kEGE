window.KT_TASK_STATE = {
  async getTask(taskId) {
    const tasks = await KT_STORAGE.getTasks();
    return tasks[taskId] || null;
  },

  async ensureMeta(taskId) {
    const existing = await this.getTask(taskId);

    // Если уже есть мета — не дергаем API
    if (existing && existing.difficulty !== undefined) {
      return existing;
    }

    const meta = await KT_TASK_API.loadTaskMeta(taskId);

    return await KT_STORAGE.updateTask(taskId, (prev) => ({
      ...prev,
      ...meta
    }));
  },

  async setSolved(taskId, solved) {
    let task = await this.getTask(taskId);

    // если меты нет — подтягиваем
    if (!task || task.difficulty === undefined) {
      task = await this.ensureMeta(taskId);
    }

    return await KT_STORAGE.updateTask(taskId, (prev) => ({
      ...prev,
      solved,
      updatedAt: new Date().toISOString()
    }));
  }
};