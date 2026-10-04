import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test("expired scrolling comments never launch after a lane frees up", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  const result = await page.evaluate(async () => {
    const uiPath = "/src/ui/floating-comments.ts";
    const defaultsPath = "/src/core/preferences.ts";
    const { FloatingComments } = await import(uiPath);
    const { defaults } = await import(defaultsPath);
    const view = new FloatingComments();
    view.host.style.cssText = "display:block;width:1000px;height:600px;position:relative";
    document.body.append(view.host);
    const preferences = { ...defaults, visible: true, displayStyle: "scroll", density: 1 };
    const first = { id: "first", author: "A", text: "A long comment occupying the lane" };
    const waiting = { id: "waiting", author: "B", text: "This must expire" };
    view.setPlayback(true, 1, 0);
    view.sync([first], preferences);
    view.sync([first, waiting], preferences);
    view.setPlayback(true, 1, 5);
    view.host.firstElementChild!.getAnimations()[0]!.currentTime = 20000;
    view.sync([first, waiting], preferences);
    const expiredAbsent = !view.host.querySelector('[data-message-id="waiting"]');
    const recent = { id: "recent", author: "C", text: "Still relevant" };
    view.sync([first, waiting, recent], preferences);
    const recentVisible = !!view.host.querySelector('[data-message-id="recent"]');
    view.dispose();
    return { expiredAbsent, recentVisible };
  });
  expect(result).toEqual({ expiredAbsent: true, recentVisible: true });
});

test("Off suspends collection and floating modes avoid hidden chat rows", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(3);
  await chooseControl(page, "Display as", "scroll");
  await expect(page.locator(".message")).toHaveCount(0);
  await expect(page.locator(".floating-comment").first()).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const message = document.createElement("yt-live-chat-text-message-renderer");
      message.id = "while-off";
      message.innerHTML = '<span id="message">Arrived while off</span>';
      root.append(message);
    });
  await expect(page.locator(".message, .floating-comment")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await chooseControl(page, "Display as", "box");
  await expect(page.locator(".message")).toHaveCount(4);
  await expect(page.locator('.message[data-message-id="while-off"]')).toContainText(
    "Arrived while off",
  );
});

test("Lively uses more than six rows when the selected area has room", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await chooseControl(page, "Display as", "top");
  await page.getByRole("slider", { name: "Text size", exact: true }).fill("12");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      for (let index = 0; index < 15; index++) {
        const message = document.createElement("yt-live-chat-text-message-renderer");
        message.id = `lively-${index}`;
        message.innerHTML = '<span id="message">Hello</span>';
        root.append(message);
      }
    });
  await chooseControl(page, "Comment density", "Lively");
  await expect.poll(() => page.locator(".floating-comment").count()).toBeGreaterThan(6);
});

test("brand SVGs work with Trusted Types enforcement and retain source geometry", async ({
  page,
}) => {
  await page.route("**/tests/fixtures/watch.html", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": "require-trusted-types-for 'script'",
      },
    });
  });
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator(".panel")).toBeVisible();
  const geometry = await page.evaluate(async () => {
    const path = "/src/ui/mark.ts";
    const { mark, birdMark } = await import(path);
    return [mark(document), birdMark(document)].map((svg) =>
      [...svg.querySelectorAll("path")].map((p) => p.getAttribute("d")),
    );
  });
  for (const [index, asset] of ["sideline", "robin"].entries()) {
    const source = await (await page.request.get(`/src/assets/${asset}.svg`)).text();
    expect(geometry[index]).toEqual([...source.matchAll(/ d="([^"]+)"/g)].map((match) => match[1]));
  }
});
