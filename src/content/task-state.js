window.KT_TASK_STATE = {
  async getTask(taskId) {
    const tasks = await KT_STORAGE.getTasks();
    return tasks[taskId] || null;
  },

  async ensureMeta(taskId) {
    const existing = await this.getTask(taskId);

    if (
      existing &&
      existing.number !== undefined &&
      existing.taskId !== undefined &&
      existing.difficulty !== undefined
    ) {
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

    if (
      !task ||
      task.number === undefined ||
      task.taskId === undefined ||
      task.difficulty === undefined
    ) {
      task = await this.ensureMeta(taskId);
    }

    return await KT_STORAGE.updateTask(taskId, (prev) => ({
      ...prev,
      solved,
      updatedAt: new Date().toISOString()
    }));
  },

  isSolvedByExamScore(taskNumber, score) {
    if (!Number.isFinite(taskNumber) || !Number.isFinite(score)) {
      return false;
    }

    if (taskNumber >= 1 && taskNumber <= 25) {
      return score === 1;
    }

    if (taskNumber === 26 || taskNumber === 27) {
      return score === 2;
    }

    return false;
  },

  async importSolvedTasksFromKim(variantData, scoreRows) {
    if (!variantData || !Array.isArray(variantData.tasks) || !Array.isArray(scoreRows)) {
      return;
    }

    const tasks = variantData.tasks;
    const count = Math.min(tasks.length, scoreRows.length);

    for (let index = 0; index < count; index += 1) {
      const apiTask = tasks[index];
      const score = scoreRows[index];

      if (!apiTask || !this.isSolvedByExamScore(apiTask.number, score)) {
        continue;
      }

      const storageTaskId = String(apiTask.taskId);

      await KT_STORAGE.updateTask(storageTaskId, (prev) => ({
        ...prev,
        solved: true,
        number: apiTask.number,
        taskId: apiTask.taskId,
        difficulty: apiTask.difficulty,
        updatedAt: new Date().toISOString()
      }));
    }
  }
};
