import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { chooseControl } from "./controls";

async function play(page: Page, paused = false) {
  await page.locator("video").evaluate((video, value) => {
    Object.defineProperty(video, "paused", { configurable: true, get: () => value });
    video.dispatchEvent(new Event(value ? "pause" : "play"));
  }, paused);
}
async function choose(page: Page, mode: string) {
  await chooseControl(page, "Display as", mode);
  await page.getByRole("button", { name: "Done", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
});

test("four themes are accessible and box sizes are easy to change", async ({ page }) => {
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  for (const theme of ["dark", "light", "midnight", "sakura"]) {
    await chooseControl(page, "Appearance", theme);
    const audit = await new AxeBuilder({ page })
      .include("sideline-overlay")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
  await chooseControl(page, "Chat box size", "large");
  await expect(page.locator("sideline-overlay .panel")).toHaveCSS("width", "420px");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(page.locator("sideline-overlay .panel")).toHaveAttribute("data-theme", "sakura");
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.getByText("More controls", { exact: true }).click();
  await expect(
    page
      .getByRole("radiogroup", { name: "Chat box size" })
      .getByRole("radio", { name: "Large", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
});

test("scrolling comments use bounded lanes, pause with video, and leave controls clickable", async ({
  page,
}) => {
  await play(page);
  await choose(page, "scroll");
  const comments = page.locator("sideline-overlay .floating-comment");
  await expect(comments).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Sideline settings", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Sideline settings");
  await expect(page.locator("sideline-overlay .floating-comments")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await play(page, true);
  await expect
    .poll(() => comments.first().evaluate((node) => node.getAnimations()[0]?.playState))
    .toBe("paused");
  await comments.first().evaluate(async (node) => {
    await node.getAnimations()[0]?.ready;
  });
  const frozen = await comments.first().evaluate((node) => node.getAnimations()[0]?.currentTime);
  await page.waitForTimeout(150);
  expect(await comments.first().evaluate((node) => node.getAnimations()[0]?.currentTime)).toBe(
    frozen,
  );
  await play(page);
  await expect
    .poll(() => comments.first().evaluate((node) => node.getAnimations()[0]?.playState))
    .toBe("running");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      for (let i = 0; i < 1000; i++) {
        const message = document.createElement("yt-live-chat-text-message-renderer");
        message.id = `new-${i}`;
        message.innerHTML = `<span id="author-name">Viewer</span><span id="message">こんにちは ${i}</span>`;
        root.append(message);
      }
    });
  await comments.evaluateAll((nodes) => {
    for (const node of nodes) {
      const animation = node.getAnimations()[0]!;
      const effect = animation.effect as KeyframeEffect;
      const keys = effect.getKeyframes();
      const distance =
        new DOMMatrix(String(keys[0]!.transform)).m41 -
        new DOMMatrix(String(keys[1]!.transform)).m41;
      const velocity = distance / Number(effect.getTiming().duration);
      animation.currentTime = Math.max(
        Number(animation.currentTime),
        (node.getBoundingClientRect().width + 48) / velocity,
      );
    }
  });
  await expect.poll(() => comments.count()).toBeGreaterThan(3);
  expect(await comments.count()).toBeLessThanOrEqual(60);
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await chooseControl(page, "Direction", "ltr");
  await chooseControl(page, "Scrolling speed", "6");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect
    .poll(() =>
      comments.first().evaluate((node) => {
        const width = node.parentElement!.clientWidth;
        const duration = Number(node.getAnimations()[0]?.effect?.getTiming().duration);
        return Math.round((duration * width) / (width + node.getBoundingClientRect().width));
      }),
    )
    .toBe(6000);
  await page.locator("#fullscreen").click();
  await expect(comments).toHaveCount(3);
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  const settings = page.getByRole("region", { name: "Customize Sideline", exact: true });
  await expect(settings.getByRole("button", { name: "Hide Sideline", exact: true })).toHaveCount(0);
  await settings.getByRole("button", { name: "Done", exact: true }).click();
  await expect(settings).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Turn off Sideline", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
  await expect(comments).toHaveCount(0);
});

test("top and bottom comments stay inside the player and seeking can replay timed comments", async ({
  page,
}) => {
  await choose(page, "top");
  const first = page.locator("sideline-overlay .floating-comment").first();
  await expect(first).toBeVisible();
  const top = await first.boundingBox();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await choose(page, "bottom");
  await expect.poll(async () => (await first.boundingBox())?.y ?? 0).toBeGreaterThan(top?.y ?? 0);
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=10s">0:10</a> きれいですね</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("1 thread · 1 timestamp");
  const seek = async (time: number) =>
    page.locator("video").evaluate((video, value) => {
      Object.defineProperty(video, "seeking", { configurable: true, get: () => true });
      video.dispatchEvent(new Event("seeking"));
      Object.defineProperty(video, "currentTime", { configurable: true, get: () => value });
      Object.defineProperty(video, "seeking", { configurable: true, get: () => false });
      video.dispatchEvent(new Event("seeked"));
    }, time);
  await seek(11);
  await expect(first).toContainText("きれいですね");
  await seek(30);
  await expect(page.locator("sideline-overlay .floating-comment")).toHaveCount(0);
  await seek(11);
  await expect(first).toContainText("きれいですね");
});

test("reduced motion replaces scrolling with stationary comments without duplicates", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await choose(page, "scroll");
  await expect(page.locator("sideline-overlay .floating-comment.fixed")).toHaveCount(3);
  await expect(page.locator("sideline-overlay .floating-comment.scrolling")).toHaveCount(0);
  await page.locator("video").evaluate((video) => {
    for (let i = 0; i < 20; i++) video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(page.locator("sideline-overlay .floating-comment")).toHaveCount(3);
});

test("floating text size is independent, expired comments do not replay, and small players stay bounded", async ({
  page,
}) => {
  await chooseControl(page, "Display as", "top");
  await expect(page.getByRole("slider", { name: "Text size" })).toHaveValue("24");
  await page.getByRole("slider", { name: "Text size" }).press("End");
  await expect(page.locator("sideline-overlay .floating-comment").first()).toHaveCSS(
    "font-size",
    "32px",
  );
  await chooseControl(page, "Display as", "box");
  await expect(page.getByRole("slider", { name: "Text size" })).toHaveValue("14");
  await choose(page, "top");
  await play(page);
  await page.locator("sideline-overlay .floating-comment").evaluateAll((nodes) => {
    for (const node of nodes) for (const animation of node.getAnimations()) animation.finish();
  });
  await expect(page.locator("sideline-overlay .floating-comment")).toHaveCount(0);
  await page.locator("video").evaluate((video) => video.dispatchEvent(new Event("timeupdate")));
  await expect(page.locator("sideline-overlay .floating-comment")).toHaveCount(0);
  await page.locator("#movie_player").evaluate((player) => {
    (player as HTMLElement).style.width = "300px";
    (player as HTMLElement).style.height = "180px";
  });
  await expect(page.locator("sideline-overlay .floating-comment")).toHaveCount(1);
  const bounds = await page.locator("sideline-overlay .floating-comment").boundingBox();
  const player = await page.locator("#movie_player").boundingBox();
  expect(
    bounds && player && bounds.x >= player.x && bounds.x + bounds.width <= player.x + player.width,
  ).toBe(true);
});

test("visual controls work by keyboard without native menus or unnecessary options", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await expect(page.locator("sideline-overlay select")).toHaveCount(0);
  const themes = page.getByRole("radiogroup", { name: "Theme", exact: true });
  await themes.getByRole("radio", { name: "Forest", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(themes.getByRole("radio", { name: "Paper", exact: true })).toBeFocused();
  await expect(themes.getByRole("radio", { name: "Paper", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("radiogroup", { name: "Chat box size", exact: true })).toBeHidden();
  await expect(page.locator("sideline-overlay .settings")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("slider", { name: "Background opacity" })).toBeInViewport();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(themes).toBeHidden();
  await expect(page.getByRole("radiogroup", { name: "Comments from", exact: true })).toHaveCount(0);
});
