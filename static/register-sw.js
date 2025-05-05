// Register the service worker
if ("serviceWorker" in navigator) {
  globalThis.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}
