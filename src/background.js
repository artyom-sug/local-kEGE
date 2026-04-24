// Service worker расширения.
//
// Пока здесь минимальный каркас.
// Позже сюда можно добавить:
// 1) миграции структуры данных между версиями;
// 2) переключение storage.sync -> storage.local;
// 3) открытие страницы статистики по команде;
// 4) фоновые служебные обработчики.

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("[kompege tracker] installed:", details.reason);
  
    // Инициализация дефолтных данных.
    const data = await chrome.storage.sync.get([
      "kt_version",
      "kt_tasks",
      "kt_settings"
    ]);
  
    if (!data.kt_version) {
      await chrome.storage.sync.set({
        kt_version: 1,
        kt_tasks: {},
        kt_settings: {
          storageArea: "sync"
        }
      });
    }
  });
  
