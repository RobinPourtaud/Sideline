export const languages = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  ar: "Arabic",
  hi: "Hindi",
  ru: "Russian",
  uk: "Ukrainian",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  tr: "Turkish",
} as const;
export type Language = keyof typeof languages;
export function language(value: unknown, fallback: Language): Language {
  return typeof value === "string" && Object.hasOwn(languages, value)
    ? (value as Language)
    : fallback;
}
