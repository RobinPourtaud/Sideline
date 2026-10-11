import { defineContentScript } from "wxt/utils/define-content-script";
import { startApp } from "../src/browser/app";
import { browserLanguages } from "../src/browser/locale";
import {
  readPreferences,
  subscribePreferences,
  writePreferences,
} from "../src/browser/preferences";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_start",
  async main(ctx) {
    const dispose = await startApp({
      read: readPreferences,
      write: writePreferences,
      subscribe: subscribePreferences,
      languages: browserLanguages(),
    });
    if (ctx.isInvalid) dispose();
    else ctx.onInvalidated(dispose);
  },
});
