import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { installCommentPreloadBridge } from "../src/youtube/comment-preload-bridge";

export default defineUnlistedScript({
  include: ["safari"],
  main() {
    installCommentPreloadBridge();
  },
});
