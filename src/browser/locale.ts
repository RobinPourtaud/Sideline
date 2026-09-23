import { browser } from "wxt/browser";

export function browserLanguages(): string[] {
  return [browser.i18n.getUILanguage(), ...navigator.languages];
}
