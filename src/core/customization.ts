import { clamp, panelBounds } from "./preferences";
import type { Preferences } from "./types";

export function customizationBounds(prefs: Preferences, area: { width: number; height: number }) {
  const panel = panelBounds(prefs, area);
  const width = Math.max(0, area.width - 16);
  const height = Math.max(0, area.height - 16);
  const settings = {
    width: Math.min(300, width),
    height: Math.min(520, height),
    left: 8,
    top: 8,
  };
  if (prefs.displayStyle !== "box") {
    settings.left = clamp(panel.left, 8, Math.max(8, area.width - settings.width - 8));
    settings.top = clamp(panel.top, 8, Math.max(8, area.height - settings.height - 8));
    return { panel, settings, side: "floating" };
  }
  if (width >= panel.width + 292) {
    settings.width = Math.min(300, width - panel.width - 12);
    const roomRight = area.width - 8 - panel.left - panel.width;
    const roomLeft = panel.left - 8;
    const right =
      roomRight >= settings.width + 12 || (roomLeft < settings.width + 12 && roomRight >= roomLeft);
    panel.left = right
      ? Math.min(panel.left, area.width - 8 - panel.width - 12 - settings.width)
      : Math.max(panel.left, 8 + settings.width + 12);
    settings.left = right ? panel.left + panel.width + 12 : panel.left - settings.width - 12;
    settings.top = clamp(panel.top, 8, Math.max(8, area.height - settings.height - 8));
    return { panel, settings, side: right ? "right" : "left" };
  }
  panel.height = Math.min(panel.height, height * 0.3);
  panel.top = 8;
  settings.width = panel.width;
  settings.left = panel.left;
  settings.top = panel.top + panel.height + 8;
  settings.height = Math.max(0, height - panel.height - 8);
  return { panel, settings, side: "below" };
}
