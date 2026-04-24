window.KT_TASK_DOM = {
  updateLocks: new WeakMap(),

  async createToggle(taskContext) {
    const wrapper = document.createElement("span");
    wrapper.className = KT_CONSTANTS.CSS.TOGGLE_WRAPPER;
    wrapper.setAttribute("data-kt-toggle-for", taskContext.key);

    const inputId = `kt-toggle-${taskContext.key.replace(/[^\w-]/g, "-")}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = inputId;
    input.className = KT_CONSTANTS.CSS.TOGGLE_INPUT;

    const label = document.createElement("label");
    label.className = KT_CONSTANTS.CSS.TOGGLE_LABEL;
    label.setAttribute("for", inputId);

    await this.syncToggleInput(input, taskContext);

    input.addEventListener("change", async () => {
      input.indeterminate = false;
      input.removeAttribute("data-kt-state");

      await KT_TASK_STATE.setSolvedForContext(taskContext, input.checked);
      await this.syncToggleInput(input, taskContext);
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

  async syncToggleInput(input, taskContext) {
    const state = await KT_TASK_STATE.getToggleState(taskContext);

    input.checked = state.checked;
    input.indeterminate = state.partial;

    if (state.partial) {
      input.setAttribute("data-kt-state", "partial");
    } else {
      input.removeAttribute("data-kt-state");
    }
  },

  async syncToggleState(toggleElement, taskContext) {
    const input = toggleElement.querySelector("input");

    if (!input) {
      return;
    }

    await this.syncToggleInput(input, taskContext);
  },

  async mountOrUpdateToggle(container, taskContext) {
    if (!taskContext) {
      return;
    }

    const previousUpdate = this.updateLocks.get(container) || Promise.resolve();

    const nextUpdate = previousUpdate
      .catch(() => {})
      .then(async () => {
        const toggles = this.getAllToggles(container);
        const matchingToggle = toggles.find(
          (toggle) => toggle.getAttribute("data-kt-toggle-for") === taskContext.key
        );

        if (matchingToggle) {
          toggles.forEach((toggle) => {
            if (toggle !== matchingToggle) {
              toggle.remove();
            }
          });

          await this.syncToggleState(matchingToggle, taskContext);
          return;
        }

        toggles.forEach((toggle) => toggle.remove());

        const toggle = await this.createToggle(taskContext);
        container.appendChild(toggle);
      });

    this.updateLocks.set(container, nextUpdate);
    await nextUpdate;
  },

  removeAllToggles() {
    document.querySelectorAll("[data-kt-toggle-for]").forEach((el) => el.remove());
  }
};
