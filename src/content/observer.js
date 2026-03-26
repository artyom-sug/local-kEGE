window.KT_OBSERVER = {
    observer: null,
  
    start(onRelevantDomChange) {
      if (this.observer) {
        this.observer.disconnect();
      }
  
      this.observer = new MutationObserver((mutations) => {
        // TODO:
        // Сейчас реагируем грубо на любые изменения.
        // После изучения DOM kompege.ru можно будет сузить условия.
        if (mutations.length > 0) {
          onRelevantDomChange();
        }
      });
  
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  };
  