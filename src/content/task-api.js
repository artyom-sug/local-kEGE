window.KT_TASK_API = {
  async loadTaskMeta(taskId) {
    try {
      const response = await fetch(`https://kompege.ru/api/v1/task/${taskId}`);

      if (!response.ok) {
        throw new Error(`Task API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        number: data.number,
        taskId: data.taskId,
        difficulty: data.difficulty
      };
    } catch (error) {
      console.error("[KT] loadTaskMeta error:", error);

      return {
        number: null,
        taskId: null,
        difficulty: null
      };
    }
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
