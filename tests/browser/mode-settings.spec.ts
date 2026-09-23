import { expect, test } from "@playwright/test";

test("display modes expose only applicable settings and retain hidden preferences", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.getByText("More controls", { exact: true }).click();
  const style = page.getByRole("radiogroup", { name: "Display as", exact: true });
  const theme = page.getByRole("radiogroup", { name: "Theme", exact: true });
  await theme.getByRole("radio", { name: "Paper", exact: true }).click();
  for (const mode of ["Chat box", "Scrolling", "Top", "Bottom", "Chat box"]) {
    await style.getByRole("radio", { name: mode, exact: true }).click();
    for (const label of ["Scrolling area", "Direction", "Scrolling speed"])
      await expect(page.getByRole("radiogroup", { name: label, exact: true })).toBeVisible({
        visible: mode === "Scrolling",
      });
    await expect(page.getByRole("radiogroup", { name: "Chat box size", exact: true })).toBeVisible({
      visible: mode === "Chat box",
    });
    await expect(page.getByRole("button", { name: "Reset panel position and size" })).toBeVisible({
      visible: mode === "Chat box",
    });
    await expect(
      page.getByRole("radiogroup", { name: "Comment density", exact: true }),
    ).toBeVisible({ visible: mode !== "Chat box" });
    await expect(theme).toBeVisible({ visible: mode !== "Scrolling" });
    await expect(page.getByRole("slider", { name: "Background opacity", exact: true })).toBeVisible(
      { visible: mode !== "Scrolling" },
    );
    await expect(page.getByRole("button", { name: "Match system theme" })).toBeVisible({
      visible: mode !== "Scrolling",
    });
    await expect(page.getByRole("slider", { name: "Text size", exact: true })).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Auto-load comments", exact: true }),
    ).toBeVisible();
  }
  await style.getByRole("radio", { name: "Scrolling", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(theme).toBeVisible();
  await expect(page.getByRole("slider", { name: "Background opacity" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Direction", exact: true })).toBeHidden();
  await expect(page.getByRole("radiogroup", { name: "Scrolling speed", exact: true })).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(theme).toBeHidden();
  await expect(page.getByRole("radiogroup", { name: "Direction", exact: true })).toBeVisible();
  await style.getByRole("radio", { name: "Chat box", exact: true }).click();
  await expect(theme.getByRole("radio", { name: "Paper", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("player icons show styled tooltips for hover and focus, dismiss on Escape and respect reduced motion", async ({
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
  const button = dock.locator("button.launcher");
  await expect(button).toHaveAttribute("aria-label", "Open Sideline");
  await button.hover();
  const tooltip = dock.getByRole("tooltip");
  await expect(tooltip).toHaveText("Open Sideline");
  await expect(button).not.toHaveAttribute("title");
  await expect(button.locator("svg")).toHaveCSS("transform", "none");
  await expect
    .poll(() => button.evaluate((node) => getComputedStyle(node, "::before").backgroundColor))
    .toBe("rgba(255, 255, 255, 0.1)");
  const player = await page.locator("#movie_player").boundingBox();
  const tip = await tooltip.boundingBox();
  expect(tip!.x).toBeGreaterThanOrEqual(player!.x);
  expect(tip!.x + tip!.width).toBeLessThanOrEqual(player!.x + player!.width);
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await button.focus();
  await expect(tooltip).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(button.locator("svg")).toHaveCSS("transform", "none");
  await button.press("Enter");
  await expect(tooltip).toBeHidden();
  await button.blur();
  await button.focus();
  await expect(tooltip).toHaveText("Turn off Sideline");
});
