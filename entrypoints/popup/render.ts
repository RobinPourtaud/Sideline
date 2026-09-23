import type { Preferences } from "../../src/core/types";
import { I18n, type MessageKey } from "../../src/i18n";

export function renderPopup(preferences: Preferences, languages?: readonly string[]) {
  const i18n = new I18n(preferences.interfaceLanguage, languages);
  document.documentElement.lang = i18n.locale;
  document.documentElement.dir = i18n.direction;
  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]"))
    node.textContent = i18n.t(node.dataset.i18n as MessageKey);
}
