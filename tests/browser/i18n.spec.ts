import { expect, test } from "@playwright/test";

const locales = [
  ["en", "Open Sideline", "Sideline settings", "More controls"],
  ["fr", "Ouvrir Sideline", "Paramètres de Sideline", "Plus de réglages"],
  ["es", "Abrir Sideline", "Ajustes de Sideline", "Más ajustes"],
  ["de", "Sideline öffnen", "Sideline-Einstellungen", "Weitere Einstellungen"],
  ["pt", "Abrir Sideline", "Configurações do Sideline", "Mais ajustes"],
  ["ja", "Sidelineを開く", "Sidelineの設定", "詳細設定"],
  ["ko", "Sideline 열기", "Sideline 설정", "추가 설정"],
  ["zh", "打开 Sideline", "Sideline 设置", "更多设置"],
  ["hi", "Sideline खोलें", "Sideline सेटिंग", "और सेटिंग"],
  ["ar", "فتح Sideline", "إعدادات Sideline", "إعدادات إضافية"],
] as const;

test("all ten interfaces have localized controls without horizontal overflow", async ({ page }) => {
  for (const [locale, open, customize, more] of locales) {
    await page.goto("/tests/fixtures/watch.html");
    await page.evaluate(
      (language) =>
        localStorage.setItem("sideline", JSON.stringify({ interfaceLanguage: language })),
      locale,
    );
    await page.reload();
    await page.getByRole("button", { name: open, exact: true }).click();
    await page.locator(".panel").hover();
    await page.getByRole("button", { name: customize, exact: true }).click();
    await page.getByText(more, { exact: true }).click();
    await expect(page.locator("sideline-overlay")).toHaveAttribute("lang", locale);
    await expect(page.locator("sideline-overlay")).toHaveAttribute(
      "dir",
      locale === "ar" ? "rtl" : "ltr",
    );
    expect(
      await page.locator(".settings").evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true);
    await expect(page.locator(".message")).toHaveCount(3);
  }
});

test("language override applies immediately, persists, and never translates comment content", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const node = document.createElement("yt-live-chat-text-message-renderer");
      node.id = "literal";
      node.innerHTML = '<span id="author-name">Done</span><span id="message">Customize</span>';
      root.append(node);
    });
  await page.locator(".panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.getByText("More controls", { exact: true }).click();
  await page.locator('summary[aria-label="Interface language"]').click();
  await page.getByRole("radio", { name: "Français", exact: true }).click();
  await expect(page.getByRole("button", { name: "Terminé", exact: true })).toBeVisible();
  await expect(page.locator('.message[data-message-id="literal"] .body')).toHaveText("Customize");
  await expect(page.locator('.message[data-message-id="literal"] .author')).toHaveText("Done");
  await expect(page.locator('summary[aria-label="Langue de l’interface"]')).toBeFocused();
  await page.reload();
  await expect(page.locator("sideline-overlay")).toHaveAttribute("lang", "fr");
});

test("automatic language uses browser locale and RTL does not change danmaku direction", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: "ar-SA" });
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/tests/fixtures/watch.html`);
    await page.getByRole("button", { name: "فتح Sideline", exact: true }).click();
    await page.locator(".panel").hover();
    await page.getByRole("button", { name: "إعدادات Sideline", exact: true }).click();
    await page.getByRole("radio", { name: "صندوق الدردشة", exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "تمرير", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator(".floating-comments")).toHaveCSS("direction", "ltr");
    await expect
      .poll(() =>
        page
          .locator(".floating-comment")
          .first()
          .evaluate((node) => {
            const frames = (node.getAnimations()[0]?.effect as KeyframeEffect)?.getKeyframes();
            return frames?.[0]?.transform;
          }),
      )
      .toMatch(/^translateX\(\d/);
  } finally {
    await context.close();
  }
});

test("popup uses the saved language and direction", async ({ page }) => {
  for (const locale of ["fr", "ar"]) {
    await page.route("**/entrypoints/popup/main.ts*", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `import '/entrypoints/popup/style.css'; import {defaults} from '/src/core/preferences.ts'; import {renderPopup} from '/entrypoints/popup/render.ts'; renderPopup({...defaults,interfaceLanguage:'${locale}'});`,
      }),
    );
    await page.goto("/entrypoints/popup/index.html");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("h2")).toHaveText(
      locale === "fr" ? "Un peu plus près de la conversation." : "أقرب قليلًا إلى الحوار.",
    );
    expect(
      await page.locator("body").evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.unroute("**/entrypoints/popup/main.ts*");
  }
});

test("changing interface language preserves an active comment-translation session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "Translator", {
      configurable: true,
      value: {
        create: async () => {
          document.documentElement.dataset.translatorCreates = String(
            Number(document.documentElement.dataset.translatorCreates ?? 0) + 1,
          );
          return { translate: async (text: string) => `T: ${text}`, destroy() {} };
        },
      },
    });
  });
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator(".panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  await page.getByText("Translation · on device", { exact: true }).click();
  await page.getByRole("button", { name: "Translate comments", exact: true }).click();
  await expect(page.locator(".message .body").first()).toContainText("T:");
  await page.getByText("More controls", { exact: true }).click();
  await page.locator('summary[aria-label="Interface language"]').click();
  await page.getByRole("radio", { name: "日本語", exact: true }).click();
  await page.getByText("翻訳 · 端末内", { exact: true }).click();
  await expect(page.getByRole("button", { name: "翻訳をオフ", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".message .body").first()).toContainText("T:");
  await expect(page.locator(".original").first()).toContainText("原文：");
  await expect(page.locator("html")).toHaveAttribute("data-translator-creates", "1");
});
