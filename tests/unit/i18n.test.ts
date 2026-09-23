import { describe, expect, it } from "vitest";
import { normalizePreferences } from "../../src/core/preferences";
import { catalogs, I18n, localeNames, resolveLocale } from "../../src/i18n";

const placeholders = (text: string) =>
  [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();

describe("interface localization", () => {
  it("ships complete catalogs with matching placeholders for all ten languages", () => {
    expect(Object.keys(catalogs)).toHaveLength(10);
    for (const catalog of Object.values(catalogs)) {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(catalogs.en).sort());
      for (const key of Object.keys(catalogs.en) as (keyof typeof catalogs.en)[]) {
        expect(catalog[key].trim()).not.toBe("");
        expect(placeholders(catalog[key])).toEqual(placeholders(catalogs.en[key]));
      }
    }
  });
  it("matches browser region variants, honors overrides, and falls back safely", () => {
    expect(resolveLocale("auto", ["xx", "fr-CA", "en-US"])).toBe("fr");
    expect(resolveLocale("auto", ["pt_BR"])).toBe("pt");
    expect(resolveLocale("auto", ["zh-Hans-CN"])).toBe("zh");
    expect(resolveLocale("auto", ["xx"])).toBe("en");
    expect(resolveLocale("ja", ["ar"])).toBe("ja");
    expect(normalizePreferences({ interfaceLanguage: "invalid" }).interfaceLanguage).toBe("auto");
    for (const language of Object.keys(localeNames))
      expect(normalizePreferences({ interfaceLanguage: language }).interfaceLanguage).toBe(
        language,
      );
  });
  it("formats counts locally and keeps substitution values literal", () => {
    const i18n = new I18n("fr");
    expect(i18n.count(2, "{count} thread", "{count} threads")).toBe("2 fils");
    i18n.setLocale("de");
    expect(i18n.count(1234, "{count} thread", "{count} threads")).toBe("1.234 Threads");
    i18n.setLocale("ar");
    expect(i18n.direction).toBe("rtl");
    expect(i18n.t("Loading {count}/{target} comments…", { count: 20, target: 100 })).toContain(
      "جارٍ تحميل التعليقات",
    );
    expect(
      i18n.t("Open {author}’s YouTube channel (new tab)", { author: "<img src=x> {count}" }),
    ).toContain("<img src=x> {count}");
    expect(i18n.known("User-authored text")).toBe("User-authored text");
  });
});
