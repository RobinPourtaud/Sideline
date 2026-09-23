import { startApp } from "../../src/browser/app";
import { normalizePreferences } from "../../src/core/preferences";
import { installCommentPreloadBridge } from "../../src/youtube/comment-preload-bridge";

const query = new URLSearchParams(location.search);
if (!location.pathname.startsWith("/watch")) history.replaceState({}, "", "/watch?v=fixture");
document.querySelector("#fullscreen")?.addEventListener("click", () => {
  void document.querySelector("#movie_player")?.requestFullscreen();
});

const video = document.querySelector("video");
if (video) Object.defineProperty(video, "duration", { configurable: true, get: () => 1200 });

if (!query.has("extension")) {
  installCommentPreloadBridge();
  await startApp({
    read: async () => normalizePreferences(JSON.parse(localStorage.getItem("sideline") ?? "null")),
    write: async (preferences) => {
      localStorage.setItem("sideline", JSON.stringify(preferences));
    },
  });
}
