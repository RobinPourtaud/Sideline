import { clamp, panelBounds } from "../core/preferences";
import type { Preferences } from "../core/types";

export function attachInteraction(
  handle: HTMLElement,
  kind: "move" | "resize",
  getPreferences: () => Preferences,
  getArea: () => { width: number; height: number },
  update: (patch: Partial<Preferences>, persist: boolean) => void,
  interacting: (active: boolean) => void = () => {},
) {
  let drag: { x: number; y: number; preferences: Preferences } | undefined;
  const change = (dx: number, dy: number, preferences: Preferences, persist: boolean) => {
    const bounds = panelBounds(preferences, getArea());
    if (kind === "move") {
      update(
        {
          x: bounds.travelX ? clamp(preferences.x + dx / bounds.travelX, 0, 1) : 0,
          y: bounds.travelY ? clamp(preferences.y + dy / bounds.travelY, 0, 1) : 0,
        },
        persist,
      );
      return;
    }
    const size = {
      width: clamp(
        bounds.width + dx,
        260,
        Math.max(260, Math.min(640, getArea().width - bounds.left - 8)),
      ),
      height: clamp(
        bounds.height + dy,
        230,
        Math.max(230, Math.min(720, getArea().height - bounds.top - 8)),
      ),
    };
    const resized = panelBounds({ ...preferences, ...size }, getArea());
    update(
      {
        ...size,
        x: resized.travelX ? clamp((bounds.left - 8) / resized.travelX, 0, 1) : 0,
        y: resized.travelY ? clamp((bounds.top - 8) / resized.travelY, 0, 1) : 0,
      },
      persist,
    );
  };
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, preferences: { ...getPreferences() } };
    interacting(true);
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
    handle.focus();
  });
  handle.addEventListener("pointermove", (event) => {
    if (drag) change(event.clientX - drag.x, event.clientY - drag.y, drag.preferences, false);
  });
  const finish = () => {
    if (drag) update({}, true);
    drag = undefined;
    interacting(false);
  };
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
  handle.addEventListener("lostpointercapture", finish);
  handle.addEventListener("keydown", (event) => {
    const delta = event.shiftKey ? 30 : 10;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-delta, 0],
      ArrowRight: [delta, 0],
      ArrowUp: [0, -delta],
      ArrowDown: [0, delta],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    change(direction[0], direction[1], getPreferences(), true);
  });
}
