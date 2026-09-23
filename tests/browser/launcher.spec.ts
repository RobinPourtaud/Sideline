import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test("activation docks in player controls, auto-hides with them and survives replacement and fullscreen", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.locator("#movie_player").evaluate((player) => {
    const controls = document.createElement("div");
    controls.className = "ytp-right-controls";
    controls.style.cssText = "position:absolute;bottom:0;left:0;height:40px;display:flex";
    player.append(controls);
  });
  const dock = page.locator(".ytp-right-controls sideline-launcher");
  await expect(dock).toHaveCount(1);
  const open = page.getByRole("button", { name: "Open Sideline", exact: true });
  await expect(open.locator("svg")).toHaveCSS("width", "26px");
  await expect(open).toHaveText("");
  await page
    .locator(".ytp-right-controls")
    .evaluate((node) => ((node as HTMLElement).style.visibility = "hidden"));
  await expect(open).toBeHidden();
  await page
    .locator(".ytp-right-controls")
    .evaluate((node) => ((node as HTMLElement).style.visibility = "visible"));
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".panel")).toBeVisible();
  await chooseControl(page, "Display as", "scroll");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const customize = page.getByRole("button", { name: "Sideline settings", exact: true });
  await expect(customize).toBeFocused();
  await page
    .locator(".ytp-right-controls")
    .evaluate((node) => node.replaceWith(node.cloneNode(false)));
  await expect(dock).toHaveCount(1);
  await page.locator("#movie_player").evaluate((node) => node.requestFullscreen());
  await customize.click();
  await expect(page.getByRole("region", { name: "Customize Sideline", exact: true })).toBeVisible();
  const settings = page.getByRole("region", { name: "Customize Sideline", exact: true });
  await expect(settings.getByRole("button", { name: "Hide Sideline", exact: true })).toHaveCount(0);
  await settings.getByRole("button", { name: "Done", exact: true }).click();
  await expect(settings).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Turn off Sideline", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Turn off Sideline", exact: true }).click();
  await expect(open).toBeVisible();
  await page.locator(".ytp-right-controls").evaluate((node) => node.remove());
  await expect(page.locator('sideline-overlay sideline-launcher[data-docked="false"]')).toHaveCount(
    1,
  );
  await open.click();
  await expect(customize).toBeVisible();
  await customize.click();
  await expect(page.getByRole("region", { name: "Customize Sideline", exact: true })).toBeVisible();
});

test("player button toggles the whole overlay and remembers the choice", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  const open = page.getByRole("button", { name: "Open Sideline", exact: true });
  const off = page.getByRole("button", { name: "Turn off Sideline", exact: true });
  await expect(open).toHaveAttribute("aria-pressed", "false");
  await open.click();
  await expect(off).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".panel")).toBeVisible();
  await off.click();
  await expect(page.locator(".panel")).toBeHidden();
  await expect(page.locator("#chatframe")).toHaveCSS("opacity", "1");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sideline") ?? "{}").visible))
    .toBe(false);
  await page.reload();
  await expect(open).toHaveAttribute("aria-pressed", "false");
  await open.click();
  await chooseControl(page, "Display as", "scroll");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".floating-comment").first()).toBeVisible();
  await off.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".floating-comment")).toHaveCount(0);
  await open.click();
  await expect(page.locator(".floating-comment").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Customize Sideline", exact: true })).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sideline") ?? "{}").visible))
    .toBe(true);
  await page.reload();
  await expect(off).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".floating-comment").first()).toBeVisible();
});

test("modern player controls keep Sideline inside the pill with matching button dimensions", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.locator("#movie_player").evaluate((player) => {
    const controls = document.createElement("div");
    controls.className = "ytp-right-controls";
    controls.style.cssText =
      "position:absolute;bottom:8px;right:8px;display:flex;height:40px;border-radius:28px;background:#0005";
    const group = document.createElement("div");
    group.className = "ytp-right-controls-left";
    group.style.display = "flex";
    const native = document.createElement("button");
    native.className = "ytp-settings-button";
    native.style.cssText = "width:48px;height:40px;padding:0;border:0";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "width:24px;height:24px";
    native.append(svg);
    group.append(native);
    controls.append(group);
    player.append(controls);
  });
  const dock = page.locator(".ytp-right-controls-left > sideline-launcher");
  await expect(dock).toHaveCount(1);
  const button = dock.getByRole("button", { name: "Open Sideline", exact: true });
  await expect(button).toHaveCSS("width", "48px");
  await expect(button).toHaveCSS("height", "40px");
  await expect(button.locator("svg")).toHaveCSS("width", "32px");
  await button.hover();
  const tooltip = dock.getByRole("tooltip");
  await expect(tooltip).toHaveCSS("font-size", "13px");
  await expect(tooltip).toHaveCSS("background-color", "rgba(0, 0, 0, 0.3)");
  const group = await page.locator(".ytp-right-controls").boundingBox();
  const control = await button.boundingBox();
  expect(control!.x).toBeGreaterThanOrEqual(group!.x);
  expect(control!.x + control!.width).toBeLessThanOrEqual(group!.x + group!.width);
});

test("one player settings button works in every display mode without disabling comments", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Sideline settings", exact: true });
  const settings = page.getByRole("region", { name: "Customize Sideline", exact: true });
  await expect(page.locator(".panel .customize")).toHaveCount(0);
  for (const mode of ["box", "scroll", "top", "bottom"]) {
    await chooseControl(page, "Display as", mode);
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.locator(mode === "box" ? ".message" : ".floating-comment").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(settings).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await expect(settings).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Turn off Sideline", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
});
