import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
});

test("editing a timestamp comment replaces its old reference instead of duplicating it", async ({
  page,
}) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0">0:00</a> Original</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator(".message").filter({ hasText: "Original" })).toHaveCount(1);
  await page.locator("ytd-comments #content-text").evaluate((node) => {
    node.innerHTML = '<a href="https://www.youtube.com/watch?v=fixture&t=30">0:30</a> Edited';
  });
  await expect(page.locator(".status")).toContainText("1 thread · 1 timestamp");
  await expect(page.locator(".message").filter({ hasText: "Original" })).toHaveCount(0);
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 30 });
    video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(page.locator(".message").filter({ hasText: "Edited" })).toHaveCount(1);
});

test("reopening floating comments restores the current snapshot", async ({ page }) => {
  await chooseControl(page, "Display as", "top");
  await expect(page.locator(".floating-comment")).toHaveCount(3);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
  await expect(page.locator(".floating-comment")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator(".floating-comment")).toHaveCount(3);
});

test("fixed comment lanes do not overlap at the smallest font size", async ({ page }) => {
  await chooseControl(page, "Display as", "top");
  await page.getByRole("slider", { name: "Text size", exact: true }).press("Home");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const boxes = await page.locator(".floating-comment").evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })
      .sort((a, b) => a.top - b.top),
  );
  expect(boxes).toHaveLength(3);
  for (let i = 1; i < boxes.length; i++)
    expect(boxes[i]!.top).toBeGreaterThanOrEqual(boxes[i - 1]!.bottom);
});

test("visible floating messages reflect content edits", async ({ page }) => {
  await chooseControl(page, "Display as", "top");
  const id = await page.locator(".floating-comment").first().getAttribute("data-message-id");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root, messageId) => {
      const item = Array.from(root.children).find((node) => node.id === messageId);
      item!.querySelector("#message")!.textContent = "Corrected message";
    }, id);
  await expect(page.locator(".floating-comment").first()).toHaveText("Corrected message");
});

test("a new watch session rejects a chat iframe still pointing at the previous video", async ({
  page,
}) => {
  await page.route("**/live_chat?v=previous", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<yt-live-chat-item-list-renderer><div id="items"><yt-live-chat-text-message-renderer id="previous"><span id="author-name">Old viewer</span><span id="message">Wrong video</span></yt-live-chat-text-message-renderer></div></yt-live-chat-item-list-renderer>',
    }),
  );
  await page
    .locator("#chatframe")
    .evaluate((frame) => ((frame as HTMLIFrameElement).src = "/live_chat?v=previous"));
  await page.frameLocator("#chatframe").getByText("Wrong video").waitFor();
  await page.evaluate(() => {
    document.dispatchEvent(new Event("yt-navigate-start"));
    history.pushState({}, "", "/watch?v=next");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await expect(page.locator(".status")).toContainText("Chat not loaded");
  await expect(page.locator(".message")).toHaveCount(0);
});

test("a late comment permalink preserves one entry and removed content clears its timestamps", async ({
  page,
}) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0">0:00</a> Unique moment</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator(".message").filter({ hasText: "Unique moment" })).toHaveCount(1);
  await page.locator("ytd-comment-thread-renderer").evaluate((thread) => {
    const link = document.createElement("a");
    link.href = "https://www.youtube.com/watch?v=fixture&lc=stable";
    link.textContent = "Posted now";
    thread.append(link);
  });
  await expect(page.locator('.message[data-message-id="stable:0"]')).toHaveCount(1);
  await expect(page.locator(".message").filter({ hasText: "Unique moment" })).toHaveCount(1);
  await expect(page.locator(".status")).toContainText("1 thread · 1 timestamp");
  await page.locator("ytd-comments #content-text").evaluate((node) => node.remove());
  await expect(page.locator(".message").filter({ hasText: "Unique moment" })).toHaveCount(0);
  await expect(page.locator(".status")).toContainText("1 thread · 0 timestamps");
});
