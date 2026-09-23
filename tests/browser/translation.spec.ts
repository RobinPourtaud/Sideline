import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseControl } from "./controls";

test("translation is opt-in, preserves originals, and turns off when languages change", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Translator", {
      configurable: true,
      value: {
        create: async ({ monitor }: { monitor: (value: unknown) => void }) => {
          monitor({
            addEventListener: (_: string, listener: (event: { loaded: number }) => void) =>
              listener({ loaded: 1 }),
          });
          return { translate: async (text: string) => `Translated: ${text}`, destroy() {} };
        },
      },
    });
  });
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await expect(page.locator("sideline-overlay .message")).toHaveCount(3);
  await expect(page.locator("sideline-overlay .original")).toHaveCount(0);
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
    await page.getByText("Translation · on device", { exact: true }).click();
  await chooseControl(page, "Comment language", "ja");
  await chooseControl(page, "Translate into", "fr");
  await page.getByRole("button", { name: "Translate comments", exact: true }).click();
  await expect(page.getByText("On-device translation on", { exact: true })).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .include("sideline-overlay")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/translation-settings-${test.info().project.name}.png`,
  });
  await page.locator('summary[aria-label="Translate into"]').press("Escape");
  await expect(page.locator("sideline-overlay .original")).toHaveCount(3);
  await expect(page.locator("sideline-overlay .body").first()).toContainText("Translated:");
  await expect(page.locator("sideline-overlay .body").first()).toHaveAttribute("lang", "fr");
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
    await page.getByText("Translation · on device", { exact: true }).click();
  await page.getByRole("button", { name: "Turn translation off", exact: true }).click();
  await expect(page.locator("sideline-overlay .original")).toHaveCount(0);
  await page.locator('summary[aria-label="Translate into"]').press("Escape");
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
    await page.getByText("Translation · on device", { exact: true }).click();
  await chooseControl(page, "Translate into", "de");
  await expect(
    page.getByRole("button", { name: "Translate comments", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
    await page.getByText("Translation · on device", { exact: true }).click();
  await expect(page.locator('summary[aria-label="Translate into"]')).toContainText("German");
  await expect(page.locator("sideline-overlay .original")).toHaveCount(0);
});

test("unsupported browsers do not offer translation", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "Translator", { value: undefined, configurable: true }),
  );
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  await expect(page.locator('summary[aria-label="Translate into"]')).toHaveCount(0);
});

test("language pack errors are actionable and leave original comments intact", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "Translator", {
      value: {
        create: async () => {
          throw new Error("Unavailable");
        },
      },
      configurable: true,
    }),
  );
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings" }).click();
  if (!(await page.locator('summary[aria-label="Translate into"]').isVisible()))
    await page.getByText("Translation · on device", { exact: true }).click();
  await page.getByRole("button", { name: "Translate comments", exact: true }).click();
  await expect(page.getByText(/Translation unavailable/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Translate comments", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("sideline-overlay .original")).toHaveCount(0);
});

test("translation updates existing danmaku without restarting its animation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Translator", {
      configurable: true,
      value: {
        create: async () => ({
          translate: async (text: string) => `Translated: ${text}`,
          destroy() {},
        }),
      },
    });
  });
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await chooseControl(page, "Display as", "scroll");
  const first = page.locator(".floating-comment").first();
  await expect
    .poll(() =>
      first.evaluate((node) => {
        const animation = node.getAnimations()[0];
        if (!animation) return false;
        animation.currentTime = 2000;
        return true;
      }),
    )
    .toBe(true);
  await page.getByText("Translation · on device", { exact: true }).click();
  await page.getByRole("button", { name: "Translate comments", exact: true }).click();
  await expect(first).toContainText("Translated:");
  expect(await first.evaluate((node) => node.getAnimations()[0]!.currentTime)).toBe(2000);
  await page.getByRole("button", { name: "Turn translation off", exact: true }).click();
  await expect(first).not.toContainText("Translated:");
  expect(await first.evaluate((node) => node.getAnimations()[0]!.currentTime)).toBe(2000);
});
