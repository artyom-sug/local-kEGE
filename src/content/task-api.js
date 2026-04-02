window.KT_TASK_API = {
  async loadTaskMeta(taskId) {
    try {
      const response = await fetch(
        `https://kompege.ru/api/v1/task/${taskId}`
      );

      if (!response.ok) {
        throw new Error("API error");
      }

      const data = await response.json();

      return {
        number: data.number,
        taskId: data.taskId,
        difficulty: data.difficulty
      };
    } catch (e) {
      console.error("[KT] API error:", e);

      return {
        number: null,
        taskId: null,
        difficulty: null
      };
    }
  }
};
