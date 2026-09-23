import { expect, it } from "vitest";
import { customizationBounds } from "../../src/core/customization";
import { defaults } from "../../src/core/preferences";

it("opens beside chat on the available side without changing saved preferences", () => {
  for (const x of [0, 0.5, 1]) {
    const prefs = { ...defaults, x };
    const result = customizationBounds(prefs, { width: 960, height: 540 });
    const { panel, settings } = result;
    expect(settings.left).toBeGreaterThanOrEqual(8);
    expect(settings.left + settings.width).toBeLessThanOrEqual(952);
    expect(panel.left + panel.width).toBeLessThanOrEqual(952);
    expect(
      settings.left + settings.width <= panel.left || panel.left + panel.width <= settings.left,
    ).toBe(true);
    expect(panel.height).toBe(defaults.height);
    expect(prefs).toEqual({ ...defaults, x });
  }
  expect(customizationBounds({ ...defaults, x: 0 }, { width: 960, height: 540 }).side).toBe(
    "right",
  );
  expect(customizationBounds(defaults, { width: 960, height: 540 }).side).toBe("left");
});

it("stacks both surfaces within a narrow player and clamps the floating editor", () => {
  for (const area of [
    { width: 300, height: 250 },
    { width: 500, height: 350 },
  ]) {
    const { panel, settings, side } = customizationBounds(defaults, area);
    expect(side).toBe("below");
    expect(settings.top).toBeGreaterThan(panel.top + panel.height);
    expect(settings.top + settings.height).toBeLessThanOrEqual(area.height - 8);
    expect(settings.left + settings.width).toBeLessThanOrEqual(area.width - 8);
  }
  const floating = customizationBounds(
    { ...defaults, displayStyle: "scroll" },
    { width: 300, height: 250 },
  );
  expect(floating.side).toBe("floating");
  expect(floating.settings.height).toBe(234);
  expect(floating.settings.width).toBe(284);
});
