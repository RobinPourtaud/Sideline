import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test("installed Chrome extension injects on YouTube and persists real extension storage", async ({
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Firefox installation is verified separately with geckodriver.",
  );
  const extension = path.resolve(".output/chrome-mv3");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const fixture = (await readFile("tests/fixtures/watch.html", "utf8")).replace(
      '<script type="module" src="/tests/fixtures/watch.ts"></script>',
      "",
    );
    const chat = await readFile("tests/fixtures/chat.html", "utf8");
    const requests: string[] = [];
    await context.route("**/*", async (route) => {
      requests.push(route.request().url());
      const url = new URL(route.request().url());
      if (url.hostname === "www.youtube.com") {
        await route.fulfill({
          contentType: "text/html",
          body: url.pathname.endsWith("chat.html") ? chat : fixture,
        });
      } else if (url.hostname === "example.com") {
        await route.fulfill({ contentType: "text/html", body: fixture });
      } else {
        await route.abort();
      }
    });
    const page = await context.newPage();
    await page.goto("https://www.youtube.com/watch?v=fixture");
    await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
    await page.locator("sideline-overlay .panel").hover();
    await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
    await page.locator("sideline-overlay .panel").hover();
    await page.getByRole("button", { name: "Sideline settings" }).click();
    await page.evaluate(() => {
      const root = document.querySelector("ytd-comments")!;
      const node = document.createElement("ytd-continuation-item-renderer");
      Object.assign(node, {
        data: { trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN", continuationEndpoint: {} },
        triggerContinuation() {
          for (let i = 0; i < 100; i++)
            root.append(document.createElement("ytd-comment-thread-renderer"));
          node.remove();
        },
      });
      root.append(node);
    });
    await page.getByText("More controls", { exact: true }).click();
    await page
      .getByRole("radiogroup", { name: "Auto-load comments", exact: true })
      .getByRole("radio", { name: "100", exact: true })
      .click();
    await expect(page.getByText("Ready · 100 comments loaded", { exact: true })).toBeVisible();
    await page.getByText("More controls", { exact: true }).click();
    if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
      await page.getByText("Translation · on device", { exact: true }).click();
    await chooseControl(page, "Appearance", "light");
    await chooseControl(page, "Comment language", "en");
    await chooseControl(page, "Translate into", "fr");
    await page
      .getByRole("radiogroup", { name: "Theme" })
      .getByRole("radio")
      .first()
      .press("Escape");
    await page.reload();
    await expect(page.locator("sideline-overlay .panel")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
    await page.locator("sideline-overlay .panel").hover();
    await page.getByRole("button", { name: "Sideline settings" }).click();
    if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
      await page.getByText("Translation · on device", { exact: true }).click();
    await expect(page.locator('summary[aria-label="Translate into"]')).toContainText("French");
    await expect(
      page.getByRole("button", { name: "Translate comments", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.getByText("More controls", { exact: true }).click();
    await page.locator('summary[aria-label="Interface language"]').click();
    await page.getByRole("radio", { name: "Français", exact: true }).click();
    await expect(page.locator("sideline-overlay")).toHaveAttribute("lang", "fr");
    await page.reload();
    await expect(page.locator("sideline-overlay")).toHaveAttribute("lang", "fr");
    expect(requests.every((url) => new URL(url).hostname === "www.youtube.com")).toBe(true);
    await page.goto("https://example.com");
    await expect(page.locator("sideline-overlay")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("installed Chrome tabs merge concurrent settings and update without reload", async ({
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Requires the installed Chrome extension.");
  const extension = path.resolve(".output/chrome-mv3");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const fixture = (await readFile("tests/fixtures/watch.html", "utf8")).replace(
      '<script type="module" src="/tests/fixtures/watch.ts"></script>',
      "",
    );
    const chat = await readFile("tests/fixtures/chat.html", "utf8");
    await context.route("**/*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: route.request().url().includes("chat.html") ? chat : fixture,
      }),
    );
    const first = await context.newPage();
    const second = await context.newPage();
    await Promise.all([
      first.goto("https://www.youtube.com/watch?v=fixture"),
      second.goto("https://www.youtube.com/watch?v=fixture"),
    ]);
    await first.getByRole("button", { name: "Open Sideline", exact: true }).click();
    await expect(
      second.getByRole("button", { name: "Turn off Sideline", exact: true }),
    ).toBeVisible();
    for (const page of [first, second])
      await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
    await Promise.all([
      first.getByRole("radio", { name: "Sakura", exact: true }).click(),
      second.getByRole("slider", { name: "Text size", exact: true }).fill("22"),
    ]);
    for (const page of [first, second]) {
      await expect(page.locator(".panel")).toHaveAttribute("data-theme", "sakura");
      await expect(page.getByRole("slider", { name: "Text size", exact: true })).toHaveValue("22");
    }
    await second.reload();
    await expect(second.locator(".panel")).toHaveAttribute("data-theme", "sakura");
    await expect(second.locator(".panel")).toHaveCSS("font-size", "22px");
    await first.getByRole("button", { name: "Done", exact: true }).click();
    await first.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
    await expect(second.getByRole("button", { name: "Open Sideline", exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
