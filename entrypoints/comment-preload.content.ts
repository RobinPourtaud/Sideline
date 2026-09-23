import { defineContentScript } from "wxt/utils/define-content-script";
import { installCommentPreloadBridge } from "../src/youtube/comment-preload-bridge";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_idle",
  world: "MAIN",
  main() {
    installCommentPreloadBridge();
  },
});
