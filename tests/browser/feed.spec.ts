import { expect, test } from "@playwright/test";

test("chat and timed comments share arrival order, expiry and seeking", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await expect(page.getByRole("radiogroup", { name: "Comments from" })).toHaveCount(0);
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">Moment</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0s">0:00</a> Perfect opening</span></ytd-comment-thread-renderer>';
  });
  const rows = page.locator("sideline-overlay .message");
  await expect(rows).toHaveCount(4);
  await expect(rows.last()).toContainText("Perfect opening");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const message = document.createElement("yt-live-chat-text-message-renderer");
      message.id = "new-chat";
      message.innerHTML =
        '<span id="author-name">Chat viewer</span><span id="message">Agreed!</span>';
      root.append(message);
    });
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(3)).toContainText("Perfect opening");
  await expect(rows.last()).toContainText("Agreed!");
  await page.locator("sideline-overlay .panel").hover();
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 9 });
    video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(rows).toHaveCount(4);
  await expect(rows.filter({ hasText: "Perfect opening" })).toHaveCount(0);
  await page.locator("sideline-overlay .panel").hover();
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "seeking", { configurable: true, get: () => true });
    video.dispatchEvent(new Event("seeking"));
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 0 });
    Object.defineProperty(video, "seeking", { configurable: true, get: () => false });
    video.dispatchEvent(new Event("seeked"));
  });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Perfect opening");
});
