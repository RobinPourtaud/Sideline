import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test("scrolling admits followers before the previous comment exits, without overlap", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await chooseControl(page, "Display as", "scroll");
  await chooseControl(page, "Comment density", "Quiet");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const first = page.locator(".floating-comment").first();
  await expect(first).toHaveCount(1);
  const id = await first.getAttribute("data-message-id");
  await expect.poll(() => first.evaluate((node) => !!node.getAnimations()[0])).toBe(true);
  await first.evaluate((node) => {
    const animation = node.getAnimations()[0]!;
    const effect = animation.effect as KeyframeEffect;
    const keys = effect.getKeyframes();
    const distance =
      new DOMMatrix(String(keys[0]!.transform)).m41 - new DOMMatrix(String(keys[1]!.transform)).m41;
    const velocity = distance / Number(effect.getTiming().duration);
    animation.currentTime = (node.getBoundingClientRect().width + 48) / velocity;
  });
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      for (let i = 0; i < 8; i++) {
        const row = document.createElement("yt-live-chat-text-message-renderer");
        row.id = `flow-${i}`;
        row.innerHTML = `<span id="message">Next! ${i}</span>`;
        root.append(row);
      }
    });
  await expect(page.locator(".floating-comment")).toHaveCount(2);
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "paused", { configurable: true, get: () => false });
    video.dispatchEvent(new Event("play"));
  });
  await expect.poll(() => page.locator(".floating-comment").count()).toBeGreaterThan(2);
  await expect(page.locator(`.floating-comment[data-message-id="${id}"]`)).toHaveCount(1);
  const boxes = await page.locator(".floating-comment").evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top };
      })
      .sort((a, b) => a.left - b.left),
  );
  expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
  for (let i = 1; i < boxes.length; i++)
    expect(boxes[i]!.left - boxes[i - 1]!.right).toBeGreaterThan(20);
});

test("long text stays complete and finishes its left exit after source eviction", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      root.innerHTML =
        '<yt-live-chat-text-message-renderer id="long"><span id="message">' +
        "Full comment ".repeat(13) +
        "</span></yt-live-chat-text-message-renderer>";
    });
  await expect(page.locator('.message[data-message-id="long"]')).toHaveCount(1);
  await chooseControl(page, "Display as", "scroll");
  const node = page.locator('.floating-comment[data-message-id="long"]');
  await expect.poll(() => node.evaluate((n) => !!n.getAnimations()[0])).toBe(true);
  expect(
    await node.evaluate((n) => n.getBoundingClientRect().width > n.parentElement!.clientWidth),
  ).toBe(true);
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => root.replaceChildren());
  await page.waitForTimeout(300);
  await expect(node).toHaveCount(1);
  const geometry = await node.evaluate((n) => {
    const animation = n.getAnimations()[0]!;
    animation.currentTime = Number(animation.effect!.getTiming().duration) - 100;
    return {
      right: n.getBoundingClientRect().right,
      left: n.parentElement!.getBoundingClientRect().left,
    };
  });
  expect(geometry.right - geometry.left).toBeGreaterThan(0);
  expect(geometry.right - geometry.left).toBeLessThan(15);
  await node.evaluate((n) => n.getAnimations()[0]!.finish());
  await expect(node).toHaveCount(0);
});
