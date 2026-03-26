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
          return Array.from(mutation.addedNodes).some((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              return false;
            }
  
            return (
              node.matches?.("span.details, .tasklist, table, tbody, tr") ||
              node.querySelector?.("span.details")
            );
          });
        });
  
        if (hasRelevantChanges) {
          scheduleScan();
        }
      });
  
      const root = document.querySelector("#app") || document.body;
  
      this.observer.observe(root, {
        childList: true,
        subtree: true
      });
  
      scheduleScan();
    }
  };
  