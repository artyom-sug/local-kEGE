window.KT_TASK_STATE = {
  createTaskContext({ taskId, number, relatedNumbers = [] }) {
    const normalizedTaskId = KT_UTILS.safeText(taskId).trim();
    const normalizedNumber = KT_UTILS.toPositiveInt(number);
    const numbers = KT_UTILS.uniqueNumbers([
      normalizedNumber,
      ...relatedNumbers
    ]);

    if (!normalizedTaskId || normalizedNumber === null || !numbers.length) {
      return null;
    }

    return {
      taskId: normalizedTaskId,
      number: normalizedNumber,
      relatedNumbers: numbers,
      key: this.buildTaskKey(normalizedTaskId, normalizedNumber)
    };
  },

  buildTaskKey(taskId, number) {
    return KT_UTILS.buildTaskProgressKey(taskId, number);
  },

  async getTask(taskId, number) {
    const tasks = await KT_STORAGE.getTasks();
    const taskKey = this.buildTaskKey(taskId, number);
    return taskKey ? tasks[taskKey] || null : null;
  },

  async ensureMeta(taskId, number) {
    const taskContext = this.createTaskContext({
      taskId,
      number
    });

    if (!taskContext) {
      return null;
    }

    const existing = await this.getTask(taskContext.taskId, taskContext.number);

    if (
      existing &&
      existing.number !== undefined &&
      existing.taskId !== undefined &&
      existing.difficulty !== undefined
    ) {
      return existing;
    }

    const meta = await this.resolveTaskMeta(taskContext.taskId, taskContext.number);

    return await KT_STORAGE.updateTask(taskContext.key, (prev) => ({
      ...prev,
      ...meta
    }));
  },

  async resolveTaskMeta(taskId, number) {
    const normalizedTaskId = KT_UTILS.safeText(taskId).trim();
    const normalizedNumber = KT_UTILS.toPositiveInt(number);
    const apiMeta = await KT_TASK_API.loadTaskMeta(normalizedTaskId);
    const matchedEntry =
      apiMeta.entries.find((entry) => entry.number === normalizedNumber) || null;

    return {
      number: normalizedNumber ?? matchedEntry?.number ?? null,
      taskId: matchedEntry?.taskId || apiMeta.taskId || normalizedTaskId,
      difficulty: matchedEntry?.difficulty ?? apiMeta.difficulty ?? null
    };
  },

  async setSolved(taskId, number, solved) {
    const taskContext = this.createTaskContext({
      taskId,
      number
    });

    if (!taskContext) {
      return null;
    }

    const task = await this.ensureMeta(taskContext.taskId, taskContext.number);

    if (task?.solved === solved) {
      return task;
    }

    return await KT_STORAGE.updateTask(taskContext.key, (prev) => ({
      ...prev,
      number: prev.number ?? task?.number ?? taskContext.number,
      taskId: prev.taskId ?? task?.taskId ?? taskContext.taskId,
      difficulty:
        prev.difficulty !== undefined
          ? prev.difficulty
          : task?.difficulty ?? null,
      solved,
      updatedAt: KT_UTILS.nowIso()
    }));
  },

  async setSolvedForContext(taskContext, solved) {
    if (!taskContext) {
      return;
    }

    for (const number of taskContext.relatedNumbers) {
      await this.setSolved(taskContext.taskId, number, solved);
    }
  },

  async getToggleState(taskContext) {
    if (!taskContext) {
      return {
        checked: false,
        partial: false
      };
    }

    const tasks = await KT_STORAGE.getTasks();
    const solvedCount = taskContext.relatedNumbers.reduce((count, number) => {
      const taskKey = this.buildTaskKey(taskContext.taskId, number);
      return tasks[taskKey]?.solved ? count + 1 : count;
    }, 0);

    return {
      checked:
        solvedCount > 0 &&
        solvedCount === taskContext.relatedNumbers.length,
      partial:
        solvedCount > 0 &&
        solvedCount < taskContext.relatedNumbers.length
    };
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

      const taskId = KT_UTILS.safeText(apiTask.taskId).trim();
      const number = KT_UTILS.toPositiveInt(apiTask.number);
      const taskKey = this.buildTaskKey(taskId, number);

      if (!taskKey) {
        continue;
      }

      await KT_STORAGE.updateTask(taskKey, (prev) => ({
        ...prev,
        solved: true,
        number,
        taskId,
        difficulty: apiTask.difficulty ?? null,
        updatedAt:
          prev.solved === true
            ? prev.updatedAt || KT_UTILS.nowIso()
            : KT_UTILS.nowIso()
      }));
    }
  }
};
