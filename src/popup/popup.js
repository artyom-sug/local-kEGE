(async function initPopup() {
  const toggle = document.getElementById("enabled-toggle");
  const statusText = document.getElementById("status-text");

  const enabled = await KT_STORAGE.isEnabled();

  toggle.checked = enabled;
  updateStatus(enabled);

  toggle.addEventListener("change", async () => {
    const nextEnabled = toggle.checked;

    await KT_STORAGE.setEnabled(nextEnabled);
    updateStatus(nextEnabled);
  });

  function updateStatus(enabledState) {
    statusText.textContent = enabledState ? "Включено" : "Выключено";
  }
})();
