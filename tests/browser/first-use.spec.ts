import { expect, test } from "@playwright/test";

test("first use starts with danmaku and 100 comments, and remembers guide dismissal", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html?fresh");
  const guide = page.getByRole("region", { name: "Sideline quick start", exact: true });
  await expect(guide).toBeHidden();
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(guide).toBeVisible();
  await expect(page.locator(".panel")).toBeHidden();
  await page.locator("header").first().hover();
  await expect(guide).toBeVisible();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await expect(guide).toBeHidden();
  await expect(page.getByRole("radio", { name: "Scrolling", exact: true })).toBeChecked();
  await page.getByText("More controls", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "100", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(guide).toBeVisible();
  await page.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
  await expect(guide).toBeHidden();
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await guide.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(guide).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("sideline")!).onboardingDismissed),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Turn off Sideline", exact: true })).toBeVisible();
  await expect(guide).toBeHidden();
  await page.evaluate(() => {
    document.dispatchEvent(new Event("yt-navigate-start"));
    history.pushState({}, "", "/watch?v=next");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await expect(guide).toBeHidden();
});

test("the first-use guide stays inside a small player and supports keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html?fresh");
  await page.locator("#movie_player").evaluate((player) => {
    (player as HTMLElement).style.cssText = "width:280px;height:240px";
  });
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  const guide = page.getByRole("region", { name: "Sideline quick start", exact: true });
  await expect(guide).toBeVisible();
  const playerBounds = (await page.locator("#movie_player").boundingBox())!;
  const guideBounds = (await guide.boundingBox())!;
  expect(guideBounds.x).toBeGreaterThanOrEqual(playerBounds.x);
  expect(guideBounds.x + guideBounds.width).toBeLessThanOrEqual(
    playerBounds.x + playerBounds.width,
  );
  expect(guideBounds.y + guideBounds.height).toBeLessThanOrEqual(
    playerBounds.y + playerBounds.height,
  );
  await guide.getByRole("button", { name: "Got it", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(guide).toBeHidden();
  await expect(page.getByRole("button", { name: "Turn off Sideline", exact: true })).toBeFocused();
});
