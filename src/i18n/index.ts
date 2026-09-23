import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";

export const localeNames = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
  hi: "हिन्दी",
  ar: "العربية",
} as const;
export type Locale = keyof typeof localeNames;
export type LocalePreference = Locale | "auto";
export type MessageKey = keyof typeof en;
export const catalogs = { en, fr, es, de, pt, ja, ko, zh, hi, ar } satisfies Record<
  Locale,
  Record<MessageKey, string>
>;

export function localePreference(value: unknown): LocalePreference {
  return typeof value === "string" && Object.hasOwn(localeNames, value)
    ? (value as Locale)
    : "auto";
}

export function resolveLocale(
  preference: LocalePreference,
  browserLanguages: readonly string[],
): Locale {
  if (preference !== "auto") return preference;
  for (const language of browserLanguages) {
    const base = language.toLowerCase().replaceAll("_", "-").split("-")[0]!;
    if (Object.hasOwn(localeNames, base)) return base as Locale;
  }
  return "en";
}

export class I18n {
  locale: Locale;
  constructor(
    preference: LocalePreference = "auto",
    private readonly browserLanguages = globalThis.navigator?.languages ?? ["en"],
  ) {
    this.locale = resolveLocale(preference, browserLanguages);
  }
  setLocale(preference: LocalePreference) {
    this.locale = resolveLocale(preference, this.browserLanguages);
  }
  get direction() {
    return this.locale === "ar" ? "rtl" : "ltr";
  }
  t(key: MessageKey, values: Record<string, string | number> = {}): string {
    const template = catalogs[this.locale][key] || en[key];
    return template.replace(/\{(\w+)\}/g, (token, name: string) => {
      const value = values[name];
      return typeof value === "number"
        ? new Intl.NumberFormat(this.locale).format(value)
        : (value ?? token);
    });
  }
  known(text: string): string {
    return Object.hasOwn(en, text) ? this.t(text as MessageKey) : text;
  }
  languageName(code: string): string {
    return new Intl.DisplayNames([this.locale], { type: "language" }).of(code) ?? code;
  }
  count(count: number, singular: MessageKey, plural: MessageKey): string {
    return this.t(new Intl.PluralRules(this.locale).select(count) === "one" ? singular : plural, {
      count,
    });
  }
}
