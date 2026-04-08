window.KT_TASK_DOM = {
  updateLocks: new WeakMap(),

  async createToggle(taskId) {
    const existingTask = await KT_TASK_STATE.getTask(taskId);

    const wrapper = document.createElement("span");
    wrapper.className = KT_CONSTANTS.CSS.TOGGLE_WRAPPER;
    wrapper.setAttribute("data-kt-toggle-for", taskId);

    const inputId = `kt-toggle-${taskId}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = inputId;
    input.className = KT_CONSTANTS.CSS.TOGGLE_INPUT;
    input.checked = Boolean(existingTask?.solved);

    const label = document.createElement("label");
    label.className = KT_CONSTANTS.CSS.TOGGLE_LABEL;
    label.setAttribute("for", inputId);

    input.addEventListener("change", async () => {
      await KT_TASK_STATE.setSolved(taskId, input.checked);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(label);

    return wrapper;
  },

  getExistingToggle(container) {
    return container.querySelector("[data-kt-toggle-for]");
  },

  getAllToggles(container) {
    return Array.from(container.querySelectorAll("[data-kt-toggle-for]"));
  },

  removeExtraToggles(container, keepTaskId = null) {
    const toggles = this.getAllToggles(container);

    toggles.forEach((toggle, index) => {
      const toggleTaskId = toggle.getAttribute("data-kt-toggle-for");

      if (keepTaskId !== null && toggleTaskId === keepTaskId && index === 0) {
        return;
      }

      toggle.remove();
    });
  },

  async mountOrUpdateToggle(container, taskId) {
    const previousUpdate = this.updateLocks.get(container) || Promise.resolve();

    const nextUpdate = previousUpdate
      .catch(() => {})
      .then(async () => {
        const toggles = this.getAllToggles(container);
        const matchingToggle = toggles.find(
          (toggle) => toggle.getAttribute("data-kt-toggle-for") === taskId
        );

        if (matchingToggle) {
          toggles.forEach((toggle) => {
            if (toggle !== matchingToggle) {
              toggle.remove();
            }
          });

          const input = matchingToggle.querySelector("input");
          const task = await KT_TASK_STATE.getTask(taskId);

          if (input) {
            input.checked = Boolean(task?.solved);
          }

          return;
        }

        toggles.forEach((toggle) => toggle.remove());

        const toggle = await this.createToggle(taskId);
        container.appendChild(toggle);
      });

    this.updateLocks.set(container, nextUpdate);
    await nextUpdate;
  },

  removeAllToggles() {
    document.querySelectorAll("[data-kt-toggle-for]").forEach((el) => el.remove());
  }
};