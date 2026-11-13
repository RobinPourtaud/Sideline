import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

export default defineBackground({
  include: ["safari"],
  main() {
    const id = "sideline-comment-preload";
    const register = async () => {
      const existing = await browser.scripting.getRegisteredContentScripts({ ids: [id] });
      if (existing.length) return;
      await browser.scripting.registerContentScripts([
        {
          id,
          matches: ["https://www.youtube.com/*"],
          js: ["safari-comment-preload.js"],
          runAt: "document_idle",
          world: "MAIN",
          persistAcrossSessions: true,
        },
      ]);
    };
    void register().catch((error) =>
      console.warn("Sideline comment bridge registration failed", error),
    );
  },
});
