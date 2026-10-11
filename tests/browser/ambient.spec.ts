import { expect, test } from "@playwright/test";

test("quiet comments reveal controls on hover and keyboard focus", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.mouse.move(10, 10);
  const panel = page.locator("sideline-overlay .panel");
  const chrome = panel.locator(".chrome");
  await expect(panel.locator(".message")).toHaveCount(3);
  await expect(chrome).toHaveCSS("opacity", "0");
  const quietHeight = await panel.evaluate((node) => node.clientHeight);
  await panel.hover();
  await expect(chrome).toHaveCSS("opacity", "1");
  await expect.poll(() => panel.evaluate((node) => node.clientHeight)).toBeGreaterThan(quietHeight);
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.mouse.move(10, 10);
  await expect(chrome).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.mouse.move(10, 10);
  await expect(chrome).toHaveCSS("opacity", "0");
  await page.keyboard.press("Tab");
  await expect(chrome).toHaveCSS("opacity", "1");
});

test("reduced motion disables disclosure transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator("sideline-overlay .chrome")).toHaveCSS("transition-duration", "0s");
});

test("revealing controls keeps the newest messages in view", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.mouse.move(10, 10);
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      for (let i = 0; i < 20; i++) {
        const message = document.createElement("yt-live-chat-text-message-renderer");
        message.id = `follow-${i}`;
        message.innerHTML = `<span id="author-name">Viewer</span><span id="message">Keep the latest message visible. ${i}</span>`;
        root.append(message);
      }
    });
  const feed = page.locator("sideline-overlay .feed");
  await expect(page.locator("sideline-overlay .message")).toHaveCount(23);
  await page.locator("sideline-overlay .panel").hover();
  await expect(page.locator("sideline-overlay .chrome")).toHaveCSS("opacity", "1");
  await expect
    .poll(() => feed.evaluate((node) => node.scrollHeight - node.scrollTop - node.clientHeight))
    .toBeLessThan(2);
  await feed.evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.mouse.move(10, 10);
  await expect(page.locator("sideline-overlay .chrome")).toHaveCSS("opacity", "0");
  await expect.poll(() => feed.evaluate((node) => node.scrollTop)).toBe(0);
});

test.describe("touch interaction", () => {
  test.use({ hasTouch: true });
  test("controls are available without hovering", async ({ page }) => {
    await page.goto("/tests/fixtures/watch.html");
    await page.getByRole("button", { name: "Open Sideline", exact: true }).tap();
    await expect(page.locator("sideline-overlay .chrome")).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Sideline settings", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
  });
});

test("idle panel fits short conversations and caps long conversations at the saved size", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.mouse.move(10, 10);
  const panel = page.locator("sideline-overlay .panel");
  const list = panel.locator(".messages");
  await expect(panel.locator(".chrome")).toHaveCSS("opacity", "0");
  await expect
    .poll(async () => (await panel.boundingBox())!.height - (await list.boundingBox())!.height)
    .toBeLessThan(32);
  const compact = (await panel.boundingBox())!.height;
  await panel.hover();
  await expect(panel.locator(".chrome")).toHaveCSS("opacity", "1");
  await expect(panel).toHaveCSS("height", "390px");
  await page.mouse.move(10, 10);
  await expect.poll(async () => (await panel.boundingBox())!.height).toBeCloseTo(compact, 0);
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      for (let i = 0; i < 20; i++) {
        const message = document.createElement("yt-live-chat-text-message-renderer");
        message.id = `size-${i}`;
        message.innerHTML = `<span id="author-name">Viewer</span><span id="message">A longer conversation fills the available space. ${i}</span>`;
        root.append(message);
      }
    });
  await expect(panel.locator(".message")).toHaveCount(23);
  await expect(panel).toHaveCSS("height", "390px");
  expect(
    await panel.locator(".feed").evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      root.querySelectorAll('[id^="size-"]').forEach((node) => node.remove());
    });
  await expect(panel.locator(".message")).toHaveCount(3);
  await expect.poll(async () => (await panel.boundingBox())!.height).toBeCloseTo(compact, 0);
});
