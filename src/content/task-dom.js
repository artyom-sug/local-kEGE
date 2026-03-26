window.KT_TASK_DOM = {
    createToggle(taskId, initialSolved, onChange) {
      const wrapper = document.createElement("span");
      wrapper.className = KT_CONSTANTS.CSS.TOGGLE_WRAPPER;
  
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(initialSolved);
      input.className = KT_CONSTANTS.CSS.TOGGLE_INPUT;
  
      const label = document.createElement("span");
      label.className = KT_CONSTANTS.CSS.TOGGLE_LABEL;
      label.textContent = "Решал";
  
      input.addEventListener("change", () => {
        onChange(input.checked);
      });
  
      wrapper.appendChild(input);
      wrapper.appendChild(label);
  
      return wrapper;
    },
  
    mountToggleNearTask(taskElement, toggleElement) {
      // TODO:
      // Здесь нужна привязка к реальной DOM-структуре kompege.ru.
      // Нужно понять:
      // 1) какой контейнер считать "карточкой задачи";
      // 2) рядом с каким элементом вставлять тумблер;
      // 3) как не вставлять дубликаты при повторных рендерах.
    }
  };
  