import { expect, type Page, test } from "@playwright/test";

async function at(page: Page, seconds: number) {
  await page.locator("video").evaluate((video, time) => {
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => time });
    video.dispatchEvent(new Event("timeupdate"));
  }, seconds);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
});

test("splits multiline timestamp comments while keeping author and emoji with their sections", async ({
  page,
}) => {
  await page.route("https://yt3.ggpht.com/section-emoji", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="9" fill="pink"/></svg>',
    }),
  );
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><a id="author-text" href="https://www.youtube.com/@viewer">Viewer</a><a href="https://www.youtube.com/watch?v=fixture&lc=sections">Permalink</a><span id="content-text">My favorite moments:<br><a href="https://www.youtube.com/watch?v=fixture&t=10">0:10</a> Opening scene<br><a href="https://www.youtube.com/watch?v=fixture&t=30">0:30</a> Great reaction <img src="https://yt3.ggpht.com/section-emoji" alt=":happy:"><br><a href="https://www.youtube.com/watch?v=fixture&t=50">0:50</a> The ending</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator(".status")).toContainText("1 thread · 3 timestamps");
  await at(page, 11);
  const first = page.locator('.message[data-message-id="sections:10"]');
  await expect(first.locator(".body")).toHaveText("My favorite moments:\n0:10 Opening scene");
  await expect(first.locator(".body")).not.toContainText("Great reaction");
  await at(page, 31);
  const second = page.locator('.message[data-message-id="sections:30"]');
  await expect(first).toHaveCount(0);
  await expect(second.locator(".body")).toContainText("0:30 Great reaction");
  await expect(second.locator("img.emoji")).toHaveAttribute("alt", ":happy:");
  await expect(second.locator(".profile-link")).toHaveAttribute(
    "href",
    "https://www.youtube.com/@viewer",
  );
  await expect(second).not.toContainText("The ending");
  await at(page, 51);
  await expect(page.locator('.message[data-message-id="sections:50"] .body')).toHaveText(
    "0:50 The ending",
  );
  await at(page, 11);
  await expect(first).toHaveCount(1);
});

test("splits inline references in document order and groups duplicate times without duplicate entries", async ({
  page,
}) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><a href="https://www.youtube.com/watch?v=fixture&lc=inline">Permalink</a><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=90">1:30</a> Later scene · <a href="https://www.youtube.com/watch?v=fixture&t=10">0:10</a> First scene · <a href="https://www.youtube.com/watch?v=other&t=20">0:20</a> Another video · <a href="https://www.youtube.com/watch?v=fixture&t=10">0:10</a> More about the first</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator(".status")).toContainText("1 thread · 2 timestamps");
  await at(page, 11);
  const row = page.locator('.message[data-message-id="inline:10"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("First scene");
  await expect(row).toContainText("Another video");
  await expect(row).toContainText("More about the first");
  await expect(row).not.toContainText("Later scene");
  await at(page, 91);
  await expect(page.locator('.message[data-message-id="inline:90"]')).toContainText("Later scene");
  await expect(page.locator('.message[data-message-id="inline:90"]')).not.toContainText(
    "First scene",
  );
});

test("editing from multiple timestamps to one restores the full comment and clears the old section", async ({
  page,
}) => {
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">A</span><a href="https://www.youtube.com/watch?v=fixture&lc=edit">Permalink</a><span id="content-text">Intro <a href="https://www.youtube.com/watch?v=fixture&t=10">0:10</a> First<br><a href="https://www.youtube.com/watch?v=fixture&t=30">0:30</a> Second</span></ytd-comment-thread-renderer>';
  });
  await expect(page.locator(".status")).toContainText("2 timestamps");
  await at(page, 31);
  await expect(page.locator('.message[data-message-id="edit:30"]')).toContainText("Second");
  await page.locator("ytd-comments #content-text").evaluate((node) => {
    node.innerHTML =
      'Intro <a href="https://www.youtube.com/watch?v=fixture&t=10">0:10</a> First<br>Second without a timestamp';
  });
  await expect(page.locator('.message[data-message-id="edit:30"]')).toHaveCount(0);
  await at(page, 11);
  await expect(page.locator('.message[data-message-id="edit:10"] .body')).toHaveText(
    "Intro 0:10 First\nSecond without a timestamp",
  );
});
