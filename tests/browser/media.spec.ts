import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test.beforeEach(async ({ page }) => {
  await page.route("https://yt3.ggpht.com/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      path: "public/icons/32.png",
    }),
  );
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
});

test("preserves profiles, badges, emoji and sticker-only messages safely", async ({ page }) => {
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const item = document.createElement("yt-live-chat-text-message-renderer");
      item.id = "rich";
      item.innerHTML =
        '<a id="author-photo" href="https://www.youtube.com/@mika?feature=chat"><img src="https://yt3.ggpht.com/avatar"></a><span id="author-name">Mika</span><yt-live-chat-author-badge-renderer aria-label="Member"><img src="https://yt3.ggpht.com/badge"></yt-live-chat-author-badge-renderer><span id="message">Hello <img alt=":wave:" src="https://yt3.ggpht.com/emoji"></span>';
      const sticker = document.createElement("yt-live-chat-paid-sticker-renderer");
      sticker.id = "sticker";
      sticker.innerHTML =
        '<span id="author-name">Sunny</span><div id="sticker"><img alt="Happy dancing pear" src="https://yt3.ggpht.com/sticker"></div>';
      root.append(item, sticker);
    });
  const rich = page.locator('[data-message-id="rich"]');
  await expect(rich.locator(".avatar-image")).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(rich.getByRole("link", { name: "Mika" })).toHaveAttribute(
    "href",
    "https://www.youtube.com/@mika",
  );
  await expect(rich.getByRole("img", { name: "Member", exact: true })).toBeVisible();
  await expect(rich.getByRole("img", { name: ":wave:" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Happy dancing pear" })).toBeVisible();
  await page
    .frameLocator("#chatframe")
    .locator("#rich #author-photo img")
    .evaluate((img) => img.setAttribute("src", "https://evil.test/avatar"));
  await expect(rich.locator(".avatar-image")).toHaveCount(0);
  await expect(rich.locator(".avatar")).toHaveText("M");
  await page
    .frameLocator("#chatframe")
    .locator("#sticker")
    .first()
    .evaluate((item) => item.setAttribute("is-deleted", ""));
  await expect(page.locator('[data-message-id="sticker"]')).toHaveCount(0);
});

test("falls back on failed images and preserves timed-comment identity", async ({ page }) => {
  await page.route("https://yt3.ggpht.com/broken", (route) => route.abort());
  await page.locator("ytd-comments").evaluate((root) => {
    const thread = document.createElement("ytd-comment-thread-renderer");
    thread.innerHTML =
      '<ytd-comment-view-model><div id="author-thumbnail"><img src="https://yt3.ggpht.com/broken"></div><a id="author-text" href="/@sunny">Sunny</a><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0s">0:00</a> lovely <img alt=":heart:" src="https://yt3.ggpht.com/broken"></span></ytd-comment-view-model>';
    root.append(thread);
  });
  const row = page.locator(".message").filter({ has: page.getByRole("link", { name: "Sunny" }) });
  await expect(row.locator(".body")).toHaveText("0:00 lovely :heart:");
  await expect(row.locator(".avatar")).toHaveText("S");
  await expect(row.locator("img")).toHaveCount(0);
});

test("floating styles show emoji and stickers without changing lane geometry on image load", async ({
  page,
}) => {
  await page.route("https://yt3.ggpht.com/broken", (route) => route.abort());
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      root.replaceChildren();
      const emoji = document.createElement("yt-live-chat-text-message-renderer");
      emoji.id = "floating-emoji";
      emoji.innerHTML =
        '<span id="author-name">Mika</span><span id="message"><img alt=":dance:" src="https://yt3.ggpht.com/emoji"><img alt=":dance:" src="https://yt3.ggpht.com/emoji"></span>';
      const sticker = document.createElement("yt-live-chat-paid-sticker-renderer");
      sticker.id = "floating-sticker";
      sticker.innerHTML =
        '<span id="author-name">Sunny</span><div id="sticker"><img alt="Dancing pear" src="https://yt3.ggpht.com/sticker"></div>';
      const broken = document.createElement("yt-live-chat-text-message-renderer");
      broken.id = "floating-broken";
      broken.innerHTML =
        '<span id="author-name">Kai</span><span id="message"><img alt=":wave:" src="https://yt3.ggpht.com/broken"></span>';
      root.append(emoji, sticker, broken);
    });
  await expect(page.locator('.message[data-message-id="floating-emoji"]')).toBeVisible();
  for (const style of ["scroll", "top", "bottom"]) {
    await chooseControl(page, "Display as", style);
    const emoji = page.locator('.floating-comment[data-message-id="floating-emoji"]');
    const sticker = page.locator('.floating-comment[data-message-id="floating-sticker"]');
    await expect(emoji.locator("img")).toHaveCount(2);
    await expect(sticker.locator("img")).toHaveAttribute("loading", "eager");
    await expect
      .poll(() =>
        page
          .locator(".floating-comment img")
          .evaluateAll(
            (images) =>
              images.length === 3 &&
              images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
          ),
      )
      .toBe(true);
    await expect(page.locator('.floating-comment[data-message-id="floating-broken"]')).toHaveText(
      ":wave:",
    );
    expect((await sticker.boundingBox())!.height).toBeLessThanOrEqual(24 * 1.6 + 4);
    const dimensions = await emoji.locator("img").first().boundingBox();
    expect(dimensions!.width).toBeCloseTo(24 * 1.2, 1);
    expect(dimensions!.height).toBeCloseTo(24 * 1.2, 1);
  }
});
