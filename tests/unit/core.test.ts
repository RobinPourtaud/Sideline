import { describe, expect, it } from "vitest";
import { defaults, normalizePreferences, panelBounds } from "../../src/core/preferences";
import {
  activeComments,
  formatTime,
  parseTimestamp,
  timestampFromLink,
} from "../../src/core/timestamps";

describe("preference migrations and untrusted storage", () => {
  it("accepts missing and malformed storage without breaking the overlay", () => {
    expect(normalizePreferences(null)).toEqual(defaults);
    expect(normalizePreferences({ opacity: Number.NaN, theme: "evil", x: Infinity })).toEqual(
      defaults,
    );
  });
  it("clamps every numeric setting and ignores unknown fields", () => {
    expect(
      normalizePreferences({ fontSize: 200, opacity: -1, x: 4, width: 1, version: 0 }),
    ).toMatchObject({
      version: 1,
      fontSize: 32,
      opacity: 10,
      x: 1,
      width: 260,
    });
  });
  it("keeps automatic loading opt-in and accepts only bounded targets", () => {
    for (const value of [undefined, -1, 10000, "100", Number.NaN])
      expect(normalizePreferences({ preloadComments: value }).preloadComments).toBe(0);
    for (const value of [0, 100, 300, 500])
      expect(normalizePreferences({ preloadComments: value }).preloadComments).toBe(value);
  });
  it("migrates old appearance settings and validates display controls", () => {
    expect(normalizePreferences({ theme: "light" })).toMatchObject({
      theme: "light",
      displayStyle: "box",
      overlayFontSize: 24,
    });
    expect(
      normalizePreferences({
        displayStyle: "invalid",
        direction: "other",
        scrollArea: "other",
        density: 99,
        speed: -1,
        overlayFontSize: 200,
      }),
    ).toMatchObject({
      displayStyle: "box",
      direction: "rtl",
      scrollArea: "top",
      density: 6,
      speed: 6,
      overlayFontSize: 32,
    });
    expect(normalizePreferences({ theme: "sakura", displayStyle: "bottom" })).toMatchObject({
      theme: "sakura",
      displayStyle: "bottom",
    });
  });
  it("keeps the whole panel within a smaller player", () => {
    const bounds = panelBounds({ ...defaults, x: 1, y: 1 }, { width: 200, height: 130 });
    expect(bounds.left + bounds.width).toBeLessThanOrEqual(200);
    expect(bounds.top + bounds.height).toBeLessThanOrEqual(130);
    expect(bounds.width).toBe(184);
  });
});

describe("timestamps", () => {
  it.each([
    ["0:00", 0],
    ["22:35", 1355],
    ["6:54:58", 24898],
    [" 1:05 ", 65],
  ])("parses %s", (input, seconds) => {
    expect(parseTimestamp(input)).toBe(seconds);
  });
  it.each(["1:99", "1:60:00", "-1:30", "12", "abc", "1:2"])("rejects %s", (input) => {
    expect(parseTimestamp(input)).toBeUndefined();
  });
  it("accepts only a timestamp on the same YouTube video", () => {
    expect(timestampFromLink("/watch?v=abc&t=1355s", "abc")).toBe(1355);
    expect(timestampFromLink("/watch?v=abc&t=0", "abc")).toBe(0);
    expect(timestampFromLink("/watch?v=other&t=10", "abc")).toBeUndefined();
    expect(timestampFromLink("https://evil.test/watch?v=abc&t=10", "abc")).toBeUndefined();
    expect(timestampFromLink("/watch?v=abc&t=-1", "abc")).toBeUndefined();
  });
  it("selects the current window after forward and backward seeks", () => {
    const comments = [0, 10, 100, 999].map((time) => ({
      id: String(time),
      text: "Hi",
      author: "A",
      time,
    }));
    expect(activeComments(comments, 11, 120).map((m) => m.time)).toEqual([10]);
    expect(activeComments(comments, 101, 120).map((m) => m.time)).toEqual([100]);
    expect(activeComments(comments, 1, 120).map((m) => m.time)).toEqual([0]);
    expect(activeComments(comments, 18, 120)).toEqual([]);
    expect(activeComments(comments, 999, 120)).toEqual([]);
  });
  it("bounds a burst without losing distinct comments with the same text", () => {
    const comments = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      text: "same",
      author: "A",
      time: 5,
    }));
    expect(activeComments(comments, 5, 60)).toHaveLength(30);
  });
  it("formats long videos without treating minutes as hours", () => {
    expect(formatTime(24898)).toBe("6:54:58");
    expect(formatTime(65)).toBe("1:05");
  });
});

it("rejects timestamp links with unexpected schemes, credentials or ports", () => {
  for (const href of [
    "http://www.youtube.com/watch?v=abc&t=10",
    "javascript://www.youtube.com/watch?v=abc&t=10",
    "https://user@www.youtube.com/watch?v=abc&t=10",
    "https://www.youtube.com:8443/watch?v=abc&t=10",
  ])
    expect(timestampFromLink(href, "abc")).toBeUndefined();
});
