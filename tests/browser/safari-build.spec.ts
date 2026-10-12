import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Safari's packaged background registers the page bridge once and bounds continuation requests", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "webkit", "Safari-specific packaged bridge");
  const output = ".output/safari-mv3";
  const manifest = JSON.parse(await readFile(`${output}/manifest.json`, "utf8"));
  expect(manifest.minimum_chrome_version).toBeUndefined();
  expect(manifest.content_scripts.every((script: { world?: string }) => !script.world)).toBe(true);
  expect(manifest.web_accessible_resources).toBeUndefined();
  expect(manifest.permissions).toEqual(["storage", "scripting"]);
  expect(manifest.host_permissions).toEqual(["https://www.youtube.com/*"]);
  const background = await readFile(`${output}/background.js`, "utf8");
  const bridge = await readFile(`${output}/safari-comment-preload.js`, "utf8");
  await page.route("https://www.youtube.com/watch*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<ytd-comments><ytd-continuation-item-renderer></ytd-continuation-item-renderer></ytd-comments>",
    }),
  );
  await page.goto("https://www.youtube.com/watch?v=safari-fixture");
  await page.evaluate(() => {
    const scripts: unknown[] = [];
    Object.assign(globalThis, {
      browser: {
        runtime: { id: "sideline-safari-test" },
        scripting: {
          getRegisteredContentScripts: async () => scripts,
          registerContentScripts: async (entries: unknown[]) => {
            scripts.push(...entries);
            document.body.dataset.registered = JSON.stringify(scripts);
          },
        },
      },
    });
    const node = document.querySelector("ytd-continuation-item-renderer");
    Object.assign(node!, {
      data: { trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN", continuationEndpoint: {} },
      triggerContinuation: () =>
        (document.body.dataset.loads = String(Number(document.body.dataset.loads ?? 0) + 1)),
    });
  });
  await page.evaluate(background);
  const registration = [
    {
      id: "sideline-comment-preload",
      matches: ["https://www.youtube.com/*"],
      js: ["safari-comment-preload.js"],
      runAt: "document_idle",
      world: "MAIN",
      persistAcrossSessions: true,
    },
  ];
  await expect
    .poll(() => page.evaluate(() => JSON.parse(document.body.dataset.registered ?? "[]")))
    .toEqual(registration);
  await page.evaluate(background);
  expect(await page.evaluate(() => JSON.parse(document.body.dataset.registered ?? "[]"))).toEqual(
    registration,
  );
  await page.evaluate(bridge);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("sideline:preload-comments"));
    document.dispatchEvent(
      new CustomEvent("sideline:preload-comments", { detail: { command: "anything" } }),
    );
    document.dispatchEvent(new Event("sideline:preload-comments"));
  });
  expect(await page.evaluate(() => document.body.dataset.loads)).toBe("1");
});
