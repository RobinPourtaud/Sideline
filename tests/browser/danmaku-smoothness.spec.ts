import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

for (const style of ["scroll", "top", "bottom"]) {
  test(`${style}: new arrivals preserve existing content and animation across box mode switches`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/watch.html");
    await page
      .frameLocator("#chatframe")
      .locator("#items")
      .evaluate((root) => {
        for (const node of root.querySelectorAll(":scope > :not(#first)")) node.remove();
      });
    await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
    await expect(page.locator(".message")).toHaveCount(1);
    for (let round = 0; round < 2; round++) {
      await chooseControl(page, "Display as", style);
      const first = page.locator('.floating-comment[data-message-id="first"]');
      await expect.poll(() => first.evaluate((node) => !!node.getAnimations()[0])).toBe(true);
      const retained = await first.evaluateHandle((node) => {
        const animation = node.getAnimations()[0]!;
        animation.currentTime = 1000;
        return { node, body: node.querySelector(".floating-body"), animation };
      });
      await page
        .frameLocator("#chatframe")
        .locator("#items")
        .evaluate((root, round) => {
          root.insertAdjacentHTML(
            "beforeend",
            `<yt-live-chat-text-message-renderer id="arrival-${round}"><span id="author-name">Viewer</span><span id="message">New comment ${round}</span></yt-live-chat-text-message-renderer>`,
          );
        }, round);
      await expect(
        page.locator(`.floating-comment[data-message-id="arrival-${round}"]`),
      ).toBeVisible();
      expect(
        await retained.evaluate(({ node, body, animation }) => ({
          connected: node.isConnected,
          bodyRetained: node.querySelector(".floating-body") === body,
          animationRetained: node.getAnimations()[0] === animation,
          time: animation.currentTime,
          state: animation.playState,
        })),
      ).toEqual({
        connected: true,
        bodyRetained: true,
        animationRetained: true,
        time: 1000,
        state: "paused",
      });
      await retained.dispose();
      await chooseControl(page, "Display as", "box");
      await expect(page.locator(".floating-comment")).toHaveCount(0);
      await expect(page.locator(".message")).toHaveCount(round + 2);
    }
  });
}

for (const direction of ["rtl", "ltr"] as const) {
  test(`${direction}: count growth and equivalent wording preserve width, text and animation`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/watch.html");
    const result = await page.evaluate(async (direction) => {
      const uiPath = "/src/ui/floating-comments.ts";
      const defaultsPath = "/src/core/preferences.ts";
      const { FloatingComments } = await import(uiPath);
      const { defaults } = await import(defaultsPath);
      const view = new FloatingComments();
      document.querySelector("sideline-overlay")!.shadowRoot!.append(view.host);
      const prefs = { ...defaults, visible: true, displayStyle: "scroll", density: 1, direction };
      const message = { id: "hello", author: "Viewer", text: "Hello!" };
      view.sync([message], prefs);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const node = view.host.firstElementChild!;
      const body = node.querySelector(".floating-body");
      const width = node.getBoundingClientRect().width;
      const animation = node.getAnimations()[0]!;
      animation.currentTime = 2000;
      const effect = animation.effect as KeyframeEffect;
      const keyframes = JSON.stringify(effect.getKeyframes());
      let keyframeWrites = 0;
      let rateWrites = 0;
      const setKeyframes = effect.setKeyframes.bind(effect);
      effect.setKeyframes = (frames) => {
        keyframeWrites++;
        setKeyframes(frames);
      };
      const rate = Object.getOwnPropertyDescriptor(Animation.prototype, "playbackRate")!;
      Object.defineProperty(animation, "playbackRate", {
        get: () => rate.get!.call(animation),
        set: (value) => {
          rateWrites++;
          rate.set!.call(animation, value);
        },
      });
      const widths: number[] = [];
      for (const count of [1, 9, 10, 99, 100, 999, 1000, 9999, 10000, 99999]) {
        view.setPlayback(true, 1, 0);
        view.sync([{ ...message, text: "HELLO...", repeatCount: count }], prefs);
        widths.push(node.getBoundingClientRect().width);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const result = {
        width,
        widths,
        keyframeWrites,
        rateWrites,
        bodyRetained: node.querySelector(".floating-body") === body,
        text: body?.textContent,
        animationRetained: node.getAnimations()[0] === animation,
        keyframesRetained: JSON.stringify(effect.getKeyframes()) === keyframes,
        time: animation.currentTime,
        label: node.querySelector(".repeats")?.getAttribute("aria-label"),
      };
      view.dispose();
      return result;
    }, direction);
    expect(result.widths.every((width) => width === result.width)).toBe(true);
    expect(result).toMatchObject({
      keyframeWrites: 0,
      rateWrites: 0,
      bodyRetained: true,
      text: "Hello!",
      animationRetained: true,
      keyframesRetained: true,
      time: 2000,
      label: "100,000 matching chat messages",
    });
  });

  test(`${direction}: resizing preserves position and uses the new screen width for spacing`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/watch.html");
    const result = await page.evaluate(async (direction) => {
      const uiPath = "/src/ui/floating-comments.ts";
      const defaultsPath = "/src/core/preferences.ts";
      const { FloatingComments } = await import(uiPath);
      const { defaults } = await import(defaultsPath);
      const view = new FloatingComments();
      document.querySelector("sideline-overlay")!.shadowRoot!.append(view.host);
      const prefs = { ...defaults, visible: true, displayStyle: "scroll", density: 1, direction };
      const message = { id: "hello", author: "Viewer", text: "Hello!", repeatCount: 9 };
      const frames = () =>
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      view.sync([message], prefs);
      await frames();
      const node = view.host.firstElementChild!;
      const animation = node.getAnimations()[0]!;
      animation.currentTime = 4000;
      const x = () => new DOMMatrix(getComputedStyle(node).transform).m41;
      const originalX = x();
      const positions: number[] = [];
      let retained = true;
      for (const width of [1920, 320, 640]) {
        view.host.style.width = `${width}px`;
        await frames();
        retained &&= view.host.firstElementChild === node && node.getAnimations()[0] === animation;
        positions.push(x());
      }
      const effect = animation.effect as KeyframeEffect;
      const keys = effect.getKeyframes();
      const start = new DOMMatrix(String(keys[0]!.transform)).m41;
      const end = new DOMMatrix(String(keys[1]!.transform)).m41;
      const duration = Number(effect.getTiming().duration);
      const target = direction === "rtl" ? 640 - node.getBoundingClientRect().width - 40 : 40;
      animation.currentTime = ((target - start) / (end - start)) * duration;
      view.sync([message, { id: "next", author: "Other", text: "Next comment" }], prefs);
      const follower = view.host.querySelector('[data-message-id="next"]')!;
      const separation = () => {
        const a = node.getBoundingClientRect();
        const b = follower.getBoundingClientRect();
        return direction === "rtl" ? b.left - a.right : a.left - b.right;
      };
      const before = separation();
      view.sync(
        [
          { ...message, repeatCount: 10000 },
          { id: "next", author: "Other", text: "Next comment" },
        ],
        prefs,
      );
      animation.currentTime = Number(animation.currentTime) + 1000;
      follower.getAnimations()[0]!.currentTime =
        Number(follower.getAnimations()[0]!.currentTime) + 1000;
      const after = separation();
      animation.finish();
      follower.getAnimations()[0]!.finish();
      await frames();
      view.host.style.width = "960px";
      await frames();
      const resized = {
        retained,
        originalX,
        positions,
        before,
        after,
        replayed: view.host.childElementCount,
      };
      view.dispose();
      return resized;
    }, direction);
    expect(result.retained).toBe(true);
    for (const x of result.positions) expect(x).toBeCloseTo(result.originalX, 2);
    expect(result.before).toBeGreaterThanOrEqual(32);
    expect(result.after).toBeCloseTo(result.before, 2);
    expect(result.replayed).toBe(0);
  });
}
