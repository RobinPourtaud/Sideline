function show(enabled) {
  const state = document.querySelector("#state");
  state.textContent =
    enabled === true
      ? "Sideline is enabled. Allow YouTube access in Safari to get started."
      : enabled === false
        ? "Sideline is installed. Enable it in Safari Settings to get started."
        : "Open Safari Settings to check that Sideline is enabled.";
}

function settingsResult(success) {
  if (!success) {
    document.querySelector("#state").textContent =
      "Couldn’t open Safari Settings. Open Safari → Settings → Extensions manually.";
  }
}

document.querySelector(".open-preferences").addEventListener("click", () => {
  window.webkit.messageHandlers.controller.postMessage("open-preferences");
});
