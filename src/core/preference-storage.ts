import { defaults, normalizePreferences } from "./preferences";
import type { Preferences } from "./types";

const prefix = "sideline.preference.";
export const preferenceKeys = Object.keys(defaults) as (keyof Preferences)[];

export function preferencePatch(before: Preferences, after: Preferences): Partial<Preferences> {
  return Object.fromEntries(
    preferenceKeys.filter((key) => before[key] !== after[key]).map((key) => [key, after[key]]),
  );
}

export function preferenceRecords(patch: Partial<Preferences>): Record<string, unknown> {
  return Object.fromEntries(
    preferenceKeys
      .filter((key) => Object.hasOwn(patch, key))
      .map((key) => [prefix + key, patch[key]]),
  );
}

export function storedPreferences(records: Record<string, unknown>): Preferences {
  const legacy = normalizePreferences(records.preferences);
  const fields = Object.fromEntries(
    preferenceKeys
      .filter((key) => Object.hasOwn(records, prefix + key))
      .map((key) => [key, records[prefix + key]]),
  );
  return normalizePreferences({ ...legacy, ...fields });
}

export function preferencesChanged(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).some((key) => key === "preferences" || key.startsWith(prefix));
}
