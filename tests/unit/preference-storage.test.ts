import { expect, it } from "vitest";
import {
  preferencePatch,
  preferenceRecords,
  storedPreferences,
} from "../../src/core/preference-storage";
import { defaults } from "../../src/core/preferences";

it("preserves unrelated writes from tabs with stale snapshots in either order", () => {
  const first = preferenceRecords(preferencePatch(defaults, { ...defaults, preloadComments: 100 }));
  const second = preferenceRecords(preferencePatch(defaults, { ...defaults, fontSize: 20 }));
  for (const records of [
    { ...first, ...second },
    { ...second, ...first },
  ]) {
    expect(storedPreferences(records)).toMatchObject({ preloadComments: 100, fontSize: 20 });
  }
});
it("reads legacy preferences without writing a stale migration snapshot", () => {
  const records = {
    preferences: { ...defaults, theme: "sakura", visible: true },
    ...preferenceRecords({ fontSize: 24 }),
  };
  expect(storedPreferences(records)).toMatchObject({
    theme: "sakura",
    visible: true,
    fontSize: 24,
  });
});
it("validates field values and ignores unknown records", () => {
  expect(
    storedPreferences({
      "sideline.preference.opacity": -5,
      "sideline.preference.theme": "invalid",
      unrelated: true,
    }),
  ).toMatchObject({ opacity: 10, theme: defaults.theme });
  expect(preferencePatch(defaults, { ...defaults })).toEqual({});
});
