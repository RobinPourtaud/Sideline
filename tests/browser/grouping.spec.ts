import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { chooseControl } from "./controls";

async function burst(page: Page, count: number, replace = true, offset = 0) {
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate(
      (root, options) => {
        if (options.replace) root.replaceChildren();
        for (let i = 0; i < options.count; i++) {
          const message = document.createElement("yt-live-chat-text-message-renderer");
          message.id = `hello-${options.offset + i}`;
          const greetings = ["Hello", " HELLO! ", "hello...", "#Hello™"];
          message.innerHTML = `<span id="author-name">Viewer ${i}</span><span id="message">${greetings[i % greetings.length]}</span>`;
          root.append(message);
        }
      },
      { count, replace, offset },
    );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(3);
});

test("groups forty greetings once and exposes density in the chat box", async ({ page }) => {
  await burst(page, 40);
  await expect(page.locator(".message")).toHaveCount(1);
  const badge = page.locator(".message .repeats");
  await expect(badge).toHaveText("+39");
  await expect(badge).toHaveAttribute("aria-label", "40 matching chat messages");
  await page.locator("video").evaluate((video) => {
    for (let i = 0; i < 20; i++) video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(badge).toHaveText("+39");
  await chooseControl(page, "Comment density", "Lively");
  await expect(page.locator(".message")).toHaveCount(40);
  await expect(page.locator(".message .repeats")).toHaveCount(0);
  await chooseControl(page, "Comment density", "Quiet");
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(badge).toHaveText("+39");
  await expect(
    page.getByText("Quiet groups repeats with a + count and remembers them for 60 seconds."),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .include("sideline-overlay")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("Quiet remembers greetings after source eviction and clears memory when turned off", async ({
  page,
}) => {
  await chooseControl(page, "Comment density", "Quiet");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await burst(page, 40);
  await expect(page.locator(".message .repeats")).toHaveText("+39");
  await burst(page, 1, true, 40);
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(page.locator(".message .repeats")).toHaveText("+40");
  await page.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(page.locator(".message .repeats")).toHaveCount(0);
});

for (const style of ["scroll", "top", "bottom"]) {
  test(`${style} updates the existing badge without restarting the comment`, async ({ page }) => {
    await chooseControl(page, "Comment density", "Quiet");
    await burst(page, 2);
    await expect(page.locator(".message .repeats")).toHaveText("+1");
    await chooseControl(page, "Display as", style);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    const comment = page.locator(".floating-comment");
    await expect(comment).toHaveCount(1);
    await expect(comment.locator(".repeats")).toHaveText("+1");
    await comment.evaluate((node) => {
      (node as HTMLElement).dataset.retained = "yes";
      node.getAnimations()[0]!.currentTime = 1000;
    });
    await burst(page, 1, false, 2);
    await expect(comment.locator(".repeats")).toHaveText("+2");
    await expect(comment).toHaveAttribute("data-retained", "yes");
    expect(await comment.evaluate((node) => node.getAnimations()[0]?.currentTime)).toBe(1000);
    expect(await comment.evaluate((node) => node.getAnimations()[0]?.playState)).toBe("paused");
  });
}

test("regular comments show loaded likes in every style and update without taking reply counts", async ({
  page,
}) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><ytd-comment-view-model><span id="author-text">Moment</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0s">0:00</a> Perfect opening</span><span id="vote-count-middle">1.2K</span></ytd-comment-view-model><div id="replies"><span id="vote-count-middle">99</span></div></ytd-comment-thread-renderer>';
  });
  const row = page.locator(".message").filter({ hasText: "Perfect opening" });
  await expect(row.locator(".likes")).toHaveAttribute("aria-label", "Likes: 1.2K");
  await expect(row.locator(".likes")).toContainText("+1.2K");
  await expect(row.locator(".repeats")).toHaveCount(0);
  await page.locator("ytd-comment-view-model #vote-count-middle").evaluate((node) => {
    node.textContent = "24";
  });
  await expect(row.locator(".likes")).toContainText("+24");
  for (const style of ["scroll", "top", "bottom"]) {
    await chooseControl(page, "Display as", style);
    const comment = page.locator(".floating-comment").filter({ hasText: "Perfect opening" });
    await expect(comment.locator(".likes")).toContainText("+24");
  }
  await page.locator("ytd-comment-view-model #vote-count-middle").evaluate((node) => {
    node.textContent = "";
  });
  await expect(page.locator(".floating-comment .likes")).toHaveCount(0);
  await chooseControl(page, "Display as", "box");
  await expect(row.locator(".likes")).toHaveCount(0);
  await page.locator("ytd-comment-view-model").evaluate((node) => {
    node.querySelector("#author-text")!.textContent = "Updated";
    node.replaceWith(...node.childNodes);
  });
  await expect(row.locator(".author")).toHaveText("Updated");
  await expect(row.locator(".likes")).toHaveCount(0);
  await page.locator("ytd-comment-thread-renderer > #vote-count-middle").evaluate((node) => {
    node.id = "vote-count-left";
    node.textContent = "0";
    node.parentElement!.querySelector("#author-text")!.textContent = "Zero";
  });
  await expect(row.locator(".author")).toHaveText("Zero");
  await expect(row.locator(".likes")).toHaveCount(0);
  await page.locator("ytd-comment-thread-renderer > #vote-count-left").evaluate((node) => {
    node.textContent = "٤٢";
  });
  await expect(row.locator(".likes")).toHaveAttribute("aria-label", "Likes: ٤٢");
});
