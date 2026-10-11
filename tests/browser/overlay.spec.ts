import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
});

test("mirrors chat, keeps emoji alt text, and treats comment HTML as text", async ({ page }) => {
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const message = document.createElement("yt-live-chat-text-message-renderer");
      message.id = "emoji";
      message.innerHTML =
        '<span id="author-name">Viewer</span><span id="message">Hello <img alt="🌱">&lt;img src=x onerror=alert(1)&gt;</span>';
      root.append(message);
    });
  await expect(page.locator("sideline-overlay .body").last()).toHaveText(
    "Hello 🌱<img src=x onerror=alert(1)>",
  );
  await expect(page.locator("sideline-overlay .messages img")).toHaveCount(0);
  await page
    .frameLocator("#chatframe")
    .locator("#emoji")
    .evaluate((node) => node.setAttribute("is-deleted", ""));
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
});

test("settings are keyboard accessible and persist through reload", async ({ page }) => {
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  await chooseControl(page, "Appearance", "light");
  await page.getByRole("slider", { name: "Text size" }).press("Home");
  for (let i = 0; i < 8; i++)
    await page.getByRole("slider", { name: "Text size" }).press("ArrowRight");
  await page.getByRole("slider", { name: "Text size" }).press("Escape");
  await expect(page.getByRole("button", { name: "Sideline settings" })).toBeFocused();
  await page.reload();
  await expect(page.locator("sideline-overlay .panel")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("sideline-overlay .panel")).toHaveCSS("font-size", "20px");
});

test("keyboard movement and resize stay within the player", async ({ page }) => {
  const panel = page.locator("sideline-overlay .panel");
  const before = await panel.boundingBox();
  await page.getByRole("button", { name: "Move panel", exact: true }).press("ArrowLeft");
  const after = await panel.boundingBox();
  expect(after?.x).toBeLessThan(before?.x ?? 0);
  await page.getByRole("button", { name: "Resize panel", exact: true }).press("ArrowDown");
  expect((await panel.boundingBox())?.height).toBeGreaterThan(before?.height ?? 0);
  await page.locator("#movie_player").evaluate((player) => {
    (player as HTMLElement).style.width = "300px";
    (player as HTMLElement).style.height = "250px";
  });
  await expect.poll(async () => (await panel.boundingBox())?.width).toBeLessThanOrEqual(284);
  await expect.poll(async () => (await panel.boundingBox())?.height).toBeLessThanOrEqual(234);
});

test("pointer dragging and resizing work", async ({ page }) => {
  const panel = page.locator("sideline-overlay .panel");
  await expect(panel.locator(".chrome")).toHaveCSS("opacity", "1");
  const before = await panel.boundingBox();
  const move = await page.getByRole("button", { name: "Move panel", exact: true }).boundingBox();
  if (!move || !before) throw new Error("Missing panel");
  await page.mouse.move(move.x + 40, move.y + 20);
  await page.mouse.down();
  await page.mouse.move(move.x - 60, move.y + 60, { steps: 6 });
  await page.mouse.up();
  expect((await panel.boundingBox())?.x).toBeLessThan(before.x - 50);
  await panel.hover();
  await expect(panel.locator(".bottom-chrome")).toHaveCSS("opacity", "1");
  const resize = await page
    .getByRole("button", { name: "Resize panel", exact: true })
    .boundingBox();
  if (!resize) throw new Error("Missing resize handle");
  const moved = await panel.boundingBox();
  await page.mouse.move(resize.x + 15, resize.y + 15);
  await page.mouse.down();
  await page.mouse.move(resize.x + 45, resize.y + 40, { steps: 5 });
  await page.mouse.up();
  expect((await panel.boundingBox())?.width).toBeGreaterThan(before.width);
  expect((await panel.boundingBox())?.x).toBeCloseTo(moved?.x ?? 0, 0);
});

test("fullscreen keeps the overlay and reports an unloaded chat source", async ({ page }) => {
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await page.locator("#fullscreen").click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe("movie_player");
  await expect(page.locator("sideline-overlay .panel")).toBeVisible();
  await page.locator("#chatframe").evaluate((frame) => {
    (frame as HTMLIFrameElement).src = "about:blank";
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("Chat unavailable");
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await page.evaluate(() => document.exitFullscreen());
  await page.locator("#chatframe").evaluate((frame) => {
    (frame as HTMLIFrameElement).src = "/tests/fixtures/chat.html";
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("Top chat replay");
});

test("timestamp coverage follows loaded comments and seeking", async ({ page }) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=10s">0:10</a> Beautiful</span></ytd-comment-thread-renderer><ytd-comment-thread-renderer><span id="author-text">B</span><span id="content-text">No timestamp</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("2 threads · 1 timestamp");
  const seek = (time: number) =>
    page.locator("video").evaluate((video, at) => {
      Object.defineProperty(video, "currentTime", { configurable: true, get: () => at });
      video.dispatchEvent(new Event("timeupdate"));
    }, time);
  await seek(11);
  await expect(page.locator("sideline-overlay .body").last()).toHaveText("0:10 Beautiful");
  await seek(19);
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await seek(11);
  await expect(page.locator("sideline-overlay .message")).toHaveCount(4);
  await page.locator("#movie_player").evaluate((p) => p.classList.add("ad-showing"));
  await expect(page.locator("sideline-overlay")).toBeHidden();
  await page.locator("#movie_player").evaluate((p) => p.classList.remove("ad-showing"));
  await expect(page.locator("sideline-overlay")).toBeVisible();
});

test("SPA navigation disposes the old panel and prevents cross-video comments", async ({
  page,
}) => {
  await page.evaluate(() => {
    history.pushState({}, "", "/results?search_query=test");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await expect(page.locator("sideline-overlay")).toHaveCount(0);
  await page.evaluate(() => {
    history.pushState({}, "", "/watch?v=next");
    document.querySelector("#chatframe")?.remove();
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await expect(page.locator("sideline-overlay")).toHaveCount(1);
  await expect(page.locator("sideline-overlay .message")).toHaveCount(0);
});

test("bounded chat handles bursts without duplicates", async ({ page }) => {
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await chooseControl(page, "Comment density", "Lively");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 1000; i++) {
        const message = document.createElement("yt-live-chat-text-message-renderer");
        message.id = `burst-${i}`;
        message.innerHTML =
          '<span id="author-name">Viewer</span><span id="message">Same text</span>';
        fragment.append(message);
      }
      root.append(fragment);
    });
  await expect(page.locator("sideline-overlay .message")).toHaveCount(120);
  expect(
    await page
      .locator("sideline-overlay .message")
      .evaluateAll((nodes) => new Set(nodes.map((n) => (n as HTMLElement).dataset.messageId)).size),
  ).toBe(120);
});

test("default dark and light settings have no automated accessibility violations", async ({
  page,
}) => {
  for (const theme of ["dark", "light"]) {
    await page.locator("sideline-overlay .panel").hover();
    await page.getByRole("button", { name: "Sideline settings" }).click();
    await chooseControl(page, "Appearance", theme);
    const results = await new AxeBuilder({ page })
      .include("sideline-overlay")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page
      .getByRole("radiogroup", { name: "Theme" })
      .getByRole("radio")
      .first()
      .press("Escape");
  }
});

test("save failures are visible without disabling the panel", async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page.getByRole("button", { name: "Move panel", exact: true }).press("ArrowLeft");
  await expect(page.locator("sideline-overlay .notice")).toContainText("couldn’t be saved");
});

test("source replacement and cross-origin frames fail safely and reconnect", async ({ page }) => {
  await page.route("http://127.0.0.1:5199/tests/fixtures/chat.html", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Another origin</p>" }),
  );
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await page.locator("#chatframe").evaluate((frame) => {
    (frame as HTMLIFrameElement).src = "http://127.0.0.1:5199/tests/fixtures/chat.html";
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("Chat unavailable");
  await page.locator("#chatframe").evaluate((frame) => {
    const replacement = document.createElement("iframe");
    replacement.id = "chatframe";
    replacement.src = "/tests/fixtures/chat.html";
    frame.replaceWith(replacement);
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("Top chat replay");
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
});

test("multiple timestamp links deduplicate per thread without including other videos or replies", async ({
  page,
}) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=10s">0:10</a><a href="https://www.youtube.com/watch?v=fixture&t=10s">0:10</a><a href="https://www.youtube.com/watch?v=fixture&t=30s">0:30</a><a href="https://www.youtube.com/watch?v=other&t=40s">0:40</a></span><div id="replies"><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=60s">1:00</a></span></div></ytd-comment-thread-renderer>';
  });
  await expect(page.locator("sideline-overlay .status")).toContainText("1 thread · 2 timestamps");
});

test("a thousand-message burst stays bounded and settles without continuous rendering", async ({
  page,
}, testInfo) => {
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  const metrics = await page.evaluate(async () => {
    const list = document.querySelector("sideline-overlay")?.shadowRoot?.querySelector(".messages");
    const chat = document.querySelector<HTMLIFrameElement>("#chatframe")?.contentDocument;
    if (!list || !chat) throw new Error("Missing fixture");
    const start = performance.now();
    let renders = 0;
    const observer = new MutationObserver(() => {
      renders++;
    });
    observer.observe(list, { childList: true });
    const fragment = chat.createDocumentFragment();
    for (let i = 0; i < 1000; i++) {
      const message = chat.createElement("yt-live-chat-text-message-renderer");
      message.id = `load-${i}`;
      message.innerHTML = `<span id="author-name">A</span><span id="message">Test message ${i}</span>`;
      fragment.append(message);
    }
    chat.querySelector("#items")?.append(fragment);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        settled.disconnect();
        reject(new Error("Burst did not settle"));
      }, 3000);
      const settled = new MutationObserver(() => {
        if (list.children.length !== 120) return;
        clearTimeout(timeout);
        settled.disconnect();
        resolve();
      });
      settled.observe(list, { childList: true });
    });
    const elapsedMs = performance.now() - start;
    await new Promise((resolve) => setTimeout(resolve, 400));
    observer.disconnect();
    return { elapsedMs, renders, rows: list.children.length };
  });
  expect(metrics.rows).toBe(120);
  expect(metrics.renders).toBeLessThanOrEqual(2);
  expect(metrics.elapsedMs).toBeLessThan(3000);
  await testInfo.attach("burst-metrics", {
    body: JSON.stringify(metrics),
    contentType: "application/json",
  });
});

test("200% text scaling and system theme retain accessible controls", async ({ page }) => {
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  await chooseControl(page, "Appearance", "system");
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio").first().press("Escape");
  await expect(page.locator("sideline-overlay .panel")).toHaveCSS("color", "rgb(23, 44, 36)");
  await page.locator("#movie_player").evaluate((player) => {
    (player as HTMLElement).style.zoom = "2";
  });
  await expect(page.getByRole("button", { name: "Hide Sideline" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resize panel", exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include("sideline-overlay")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
