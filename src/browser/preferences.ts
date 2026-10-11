import { browser } from "wxt/browser";
import {
  preferenceRecords,
  preferencesChanged,
  storedPreferences,
} from "../core/preference-storage";
import type { Preferences } from "../core/types";

export async function readPreferences(): Promise<Preferences> {
  return storedPreferences(await browser.storage.local.get(null));
}

export async function writePreferences(
  preferences: Preferences,
  patch: Partial<Preferences> = preferences,
): Promise<void> {
  // Separate keys keep unrelated edits in different tabs from overwriting each other.
  await browser.storage.local.set(preferenceRecords(patch));
}

export function subscribePreferences(changed: (preferences: Preferences) => void): () => void {
  let active = true;
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area !== "local" || !preferencesChanged(changes)) return;
    void readPreferences()
      .then((preferences) => {
        if (active) changed(preferences);
      })
      .catch(() => {});
  };
  browser.storage.onChanged.addListener(listener);
  return () => {
    active = false;
    browser.storage.onChanged.removeListener(listener);
  };
}
