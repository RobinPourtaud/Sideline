import { expect, test } from "@playwright/test";

test("customization sits beside a live preview, follows themes and restores the saved layout", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  const panel = page.locator("sideline-overlay .panel");
  await panel.hover();
  await expect(panel.locator(".chrome")).toHaveCSS("opacity", "1");
  const original = await panel.boundingBox();
  const relativeBounds = () =>
    panel.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const player = document.querySelector("#movie_player")!.getBoundingClientRect();
      return {
        x: rect.x - player.x,
        y: rect.y - player.y,
        width: rect.width,
        height: rect.height,
        playerScrollTop: document.querySelector("#movie_player")!.scrollTop,
        overlayScrollTop: (node.getRootNode() as ShadowRoot).host.scrollTop,
      };
    });
  const originalRelative = await relativeBounds();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  const editor = page.getByRole("region", { name: "Customize Sideline", exact: true });
  await expect(editor).toBeVisible();
  await expect(panel.locator(".feed")).toBeVisible();
  await expect(panel.locator(".message")).toHaveCount(3);
  await expect(panel.locator(".status")).toBeHidden();
  const aside = await editor.boundingBox();
  expect(aside!.x + aside!.width).toBeLessThanOrEqual(original!.x);
  await page.getByRole("radio", { name: "Paper", exact: true }).click();
  await expect(editor).toHaveAttribute("data-theme", "light");
  await expect(panel).toHaveAttribute("data-theme", "light");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const item = document.createElement("yt-live-chat-text-message-renderer");
      item.id = "preview";
      item.innerHTML =
        '<span id="author-name">Viewer</span><span id="message">Still updating while customizing</span>';
      root.append(item);
    });
  await expect(panel.locator(".message")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(editor).toBeHidden();
  await panel.hover();
  await expect.poll(relativeBounds).toEqual(originalRelative);
});

test("a small player shows comments above the controls and keeps both inside fullscreen", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  const panel = page.locator("sideline-overlay .panel");
  await panel.hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.locator("#movie_player").evaluate((node) => {
    (node as HTMLElement).style.width = "300px";
    (node as HTMLElement).style.height = "250px";
  });
  const editor = page.locator("sideline-overlay .customization");
  await expect(editor).toHaveAttribute("data-side", "below");
  await expect(panel.locator(".feed")).toBeVisible();
  const chat = await panel.boundingBox();
  const settings = await editor.boundingBox();
  const player = await page.locator("#movie_player").boundingBox();
  expect(settings!.y).toBeGreaterThan(chat!.y + chat!.height);
  expect(settings!.y + settings!.height).toBeLessThanOrEqual(player!.y + player!.height);
  await page.locator("#movie_player").evaluate((node) => node.requestFullscreen());
  await expect(editor).toBeVisible();
  await expect(panel.locator(".feed")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(editor).toBeHidden();
});
