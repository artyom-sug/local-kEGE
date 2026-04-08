window.KT_OBSERVER = {
  observer: null,

  start(onRelevantDomChange) {
    if (this.observer) {
      this.observer.disconnect();
    }

    let scheduled = false;

    const scheduleScan = () => {
      if (scheduled) {
        return;
      }

      scheduled = true;

      requestAnimationFrame(() => {
        scheduled = false;
        onRelevantDomChange();
      });
    };

    this.observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some((mutation) => {
        if (mutation.type === "characterData") {
          return true;
        }

        if (mutation.type === "childList") {
          if (mutation.addedNodes.length || mutation.removedNodes.length) {
            return true;
          }
        }

        return false;
      });

      if (hasRelevantChanges) {
        scheduleScan();
      }
    });

    const root = document.querySelector("#app") || document.body;

    this.observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });

    scheduleScan();
  }
};
