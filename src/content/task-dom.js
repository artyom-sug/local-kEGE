window.KT_TASK_DOM = {
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
    label.textContent = "решал";

    input.addEventListener("change", async () => {
      const checked = input.checked;

      await KT_TASK_STATE.setSolved(taskId, checked);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(label);

    return wrapper;
  },

  hasToggle(detailsElement, taskId) {
    return Boolean(
      detailsElement.querySelector(`[data-kt-toggle-for="${taskId}"]`)
    );
  },

  async mountToggleNearTask(detailsElement, taskId) {
    const toggleElement = await this.createToggle(taskId);

    const firstInnerSpan = Array.from(detailsElement.childNodes).find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.tagName === "SPAN"
    );

    if (firstInnerSpan) {
      detailsElement.insertBefore(toggleElement, firstInnerSpan);
      return;
    }

    detailsElement.appendChild(toggleElement);
  }
};