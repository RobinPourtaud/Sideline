import { localePreference } from "../i18n";
import { language } from "./languages";
import type { Preferences } from "./types";

export const defaults: Preferences = {
  version: 1,
  interfaceLanguage: "auto",
  translationSource: "ja",
  translationTarget: "en",
  visible: false,
  theme: "dark",
  displayStyle: "box",
  scrollArea: "top",
  direction: "rtl",
  speed: 12,
  density: 3,
  preloadComments: 0,
  fontSize: 14,
  overlayFontSize: 24,
  opacity: 94,
  x: 1,
  y: 0,
  width: 330,
  height: 390,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizePreferences(value: unknown): Preferences {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const number = (key: keyof Preferences, min: number, max: number) =>
    typeof data[key] === "number" && Number.isFinite(data[key])
      ? clamp(data[key], min, max)
      : (defaults[key] as number);
  return {
    version: 1,
    interfaceLanguage: localePreference(data.interfaceLanguage),
    translationSource: language(data.translationSource, defaults.translationSource),
    translationTarget: language(data.translationTarget, defaults.translationTarget),
    visible: typeof data.visible === "boolean" ? data.visible : defaults.visible,
    theme:
      data.theme === "light" ||
      data.theme === "system" ||
      data.theme === "midnight" ||
      data.theme === "sakura"
        ? data.theme
        : "dark",
    displayStyle:
      data.displayStyle === "scroll" ||
      data.displayStyle === "top" ||
      data.displayStyle === "bottom"
        ? data.displayStyle
        : "box",
    scrollArea:
      data.scrollArea === "bottom" || data.scrollArea === "full" ? data.scrollArea : "top",
    direction: data.direction === "ltr" ? "ltr" : "rtl",
    speed: number("speed", 6, 20),
    density: Math.round(number("density", 1, 6)),
    preloadComments: [100, 300, 500].includes(data.preloadComments as number)
      ? (data.preloadComments as number)
      : 0,
    fontSize: number("fontSize", 12, 32),
    overlayFontSize: number("overlayFontSize", 12, 32),
    opacity: number("opacity", 10, 100),
    x: number("x", 0, 1),
    y: number("y", 0, 1),
    width: number("width", 260, 640),
    height: number("height", 230, 720),
  };
}

export function panelBounds(prefs: Preferences, area: { width: number; height: number }) {
  const margin = 8;
  const width = Math.max(0, Math.min(prefs.width, area.width - margin * 2));
  const height = Math.max(0, Math.min(prefs.height, area.height - margin * 2));
  const travelX = Math.max(0, area.width - width - margin * 2);
  const travelY = Math.max(0, area.height - height - margin * 2);
  return {
    width,
    height,
    left: margin + travelX * prefs.x,
    top: margin + travelY * prefs.y,
    travelX,
    travelY,
  };
}
