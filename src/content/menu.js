window.KT_MENU = {
  injected: false,
  originalContent: null,
  originalTitle: null,
  footerElement: null,

  injectStatsMenuItem() {
    if (this.injected) return;

    const navWrap = document.querySelector(".nav-wrap");
    if (!navWrap) return;

    const existingItem = navWrap.querySelector("p");
    if (!existingItem) return;

    const item = existingItem.cloneNode(true);
    item.textContent = "Мой прогресс";

    const newItem = item.cloneNode(true);

    newItem.addEventListener("click", () => {
      this.openStatsPage();
    });

    navWrap.appendChild(newItem);

    this.injected = true;
  },

  openStatsPage() {
    const main = document.querySelector(".main");
    const title = document.querySelector(".title h1");
    const footer = document.querySelector(".footer");

    if (!main || !title) return;

    // сохраняем оригинал
    if (!this.originalContent) {
      this.originalContent = main.innerHTML;
      this.originalTitle = title.textContent;
      this.footerElement = footer;
    }

    // скрываем footer
    if (footer) {
      footer.style.display = "none";
    }

    // меняем заголовок
    title.textContent = "Мой прогресс и статистика";

    // рендер страницы
    main.innerHTML = `
      <div class="kt-stats-page">
        <h2>Мой прогресс</h2>
        <p id="kt-total">Загрузка...</p>
        <button id="kt-back">На главную</button>
      </div>
    `;

    this.renderStats();

    const backBtn = document.getElementById("kt-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.restoreMainPage();
      });
    }
  },

  async renderStats() {
    const tasks = await KT_STORAGE.getTasks();

    const solved = Object.values(tasks).filter(t => t.solved).length;

    const el = document.getElementById("kt-total");
    if (el) {
      el.textContent = `Решено задач: ${solved}`;
    }
  },

  restoreMainPage() {
    const main = document.querySelector(".main");
    const title = document.querySelector(".title h1");

    if (!main || !title || !this.originalContent) return;

    // возвращаем контент
    main.innerHTML = this.originalContent;
    title.textContent = this.originalTitle;

    // возвращаем footer
    if (this.footerElement) {
      this.footerElement.style.display = "";
    }
  }
};