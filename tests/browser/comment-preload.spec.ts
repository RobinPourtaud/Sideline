import { expect, type Page, test } from "@playwright/test";

async function openControls(page: Page) {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator(".panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.getByText("More controls", { exact: true }).click();
}

async function installLoader(page: Page, limit: number) {
  await page.evaluate((limit) => {
    const root = document.querySelector("ytd-comments:not([hidden])")!;
    const inactive = document.createElement("ytd-comments");
    inactive.hidden = true;
    root.before(inactive);
    root.setAttribute("style", "margin-top:1600px");
    let count = 0;
    const next = () => {
      const node = document.createElement("ytd-continuation-item-renderer");
      Object.assign(node, {
        polymerController: {
          data: { trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN", continuationEndpoint: {} },
          triggerContinuation() {
            root.setAttribute(
              "data-requests",
              String(Number(root.getAttribute("data-requests") ?? 0) + 1),
            );
            if (count >= limit) return;
            setTimeout(() => {
              node.remove();
              for (let i = 0; i < 20; i++) {
                const row = document.createElement("ytd-comment-thread-renderer");
                row.innerHTML = `<span id="author-text">Viewer ${++count}</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=10s">0:10</a> Moment ${count}</span>`;
                root.append(row);
              }
              next();
            }, 100);
          },
        },
      });
      root.append(node);
    };
    next();
  }, limit);
}

test("preloads to 100 without scrolling and collects timestamps from the active comments root", async ({
  page,
}) => {
  await openControls(page);
  await installLoader(page, 100);
  const start = await page.evaluate(() => scrollY);
  await page
    .getByRole("radiogroup", { name: "Auto-load comments", exact: true })
    .getByRole("radio", { name: "100", exact: true })
    .click();
  await expect(page.getByText("Ready · 100 comments loaded", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(start);
  await expect(page.locator("ytd-comments:not([hidden])")).toHaveAttribute("data-requests", "5");
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 10 });
    video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(page.locator(".message").filter({ hasText: "Moment" })).toHaveCount(30);
});

test("stalled continuations are requested only once and can be stopped in fullscreen", async ({
  page,
}) => {
  await openControls(page);
  await installLoader(page, 0);
  await page.locator("#movie_player").evaluate((player) => player.requestFullscreen());
  await page
    .getByRole("radiogroup", { name: "Auto-load comments", exact: true })
    .getByRole("radio", { name: "100", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await expect(page.locator("ytd-comments:not([hidden])")).toHaveAttribute("data-requests", "1");
  await page
    .getByRole("radiogroup", { name: "Auto-load comments", exact: true })
    .getByRole("radio", { name: "Off", exact: true })
    .click();
  await expect(
    page.getByText("Auto-load is off. Comments you load yourself still appear.", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.exitFullscreen());
  await page
    .getByRole("radiogroup", { name: "Auto-load comments", exact: true })
    .getByRole("radio", { name: "100", exact: true })
    .click();
  await page.evaluate(() => {
    history.pushState({}, "", "/results?search_query=fixture");
    document.dispatchEvent(new Event("yt-navigate-start"));
  });
  await expect(page.locator("sideline-overlay")).toHaveCount(0);
  await page.waitForTimeout(700);
  await expect(page.locator("ytd-comments:not([hidden])")).toHaveAttribute("data-requests", "1");
});

test("missing handlers stop with an honest partial count and never expand replies", async ({
  page,
}) => {
  await openControls(page);
  await page.evaluate(() => {
    const root = document.querySelector("ytd-comments:not([hidden])")!;
    const row = document.createElement("ytd-comment-thread-renderer");
    row.innerHTML = '<span id="content-text">No timestamp</span>';
    const reply = document.createElement("ytd-continuation-item-renderer");
    Object.assign(reply, {
      data: { trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN", continuationEndpoint: {} },
      triggerContinuation() {
        root.setAttribute("data-reply-request", "true");
      },
    });
    row.append(reply);
    root.append(row);
  });
  await page
    .getByRole("radiogroup", { name: "Auto-load comments", exact: true })
    .getByRole("radio", { name: "100", exact: true })
    .click();
  await expect(
    page.getByText("YouTube stopped loading · 1 comment loaded", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator("ytd-comments")).not.toHaveAttribute("data-reply-request");
});

test("saved auto-load starts on the next video without pressing a load button", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.evaluate(() =>
    localStorage.setItem("sideline", JSON.stringify({ visible: true, preloadComments: 100 })),
  );
  await page.reload();
  await installLoader(page, 100);
  await expect(page.locator("ytd-comments:not([hidden]) ytd-comment-thread-renderer")).toHaveCount(
    100,
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("yt-navigate-start"));
    document.querySelector("ytd-comments:not([hidden])")!.replaceChildren();
    history.pushState({}, "", "/watch?v=next");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await installLoader(page, 100);
  await expect(page.locator("ytd-comments:not([hidden]) ytd-comment-thread-renderer")).toHaveCount(
    100,
  );
});
