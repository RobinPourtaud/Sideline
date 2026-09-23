import { browser } from "wxt/browser";
import { normalizePreferences } from "../core/preferences";
import type { Preferences } from "../core/types";

const key = "preferences";
export async function readPreferences(): Promise<Preferences> {
  const result = await browser.storage.local.get(key);
  return normalizePreferences(result[key]);
}
export async function writePreferences(preferences: Preferences): Promise<void> {
  await browser.storage.local.set({ [key]: preferences });
}
