(async function initKompegeTracker() {
    console.log("[kompege tracker] content script loaded");
  
    // TODO:
    // Главный orchestration-файл.
    // Здесь позже будет:
    // 1) поиск всех видимых задач на странице;
    // 2) извлечение taskId из DOM / URL / data-атрибутов;
    // 3) вставка тумблера возле каждой задачи;
    // 4) запуск MutationObserver;
    // 5) добавление пункта меню "Статистика".
  
    KT_MENU.injectStatsMenuItem();
  
    KT_OBSERVER.start(() => {
      // TODO:
      // Повторно сканировать DOM и аккуратно дорисовывать тумблеры
      // только для новых задач.
    });
  })();
  