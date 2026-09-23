import { expect, it } from "vitest";
import { CommentFeed } from "../../src/core/feed";
import { normalizePreferences } from "../../src/core/preferences";

const chat = (id: string) => ({ id, author: "Viewer", text: id });
const timed = { ...chat("moment"), time: 10 };

it("interleaves arrivals without moving existing comments on each playback tick", () => {
  const feed = new CommentFeed();
  feed.update([chat("a")], []);
  expect(feed.update([chat("a")], [timed]).map((m) => m.id)).toEqual(["a", "moment"]);
  expect(feed.update([chat("a"), chat("b")], [timed]).map((m) => m.id)).toEqual([
    "a",
    "moment",
    "b",
  ]);
  expect(feed.update([chat("a"), chat("b")], []).map((m) => m.id)).toEqual(["a", "b"]);
  feed.reset();
  expect(feed.update([], [timed])).toEqual([timed]);
});

it("bounds the merged feed without rotating evicted messages back into view", () => {
  const feed = new CommentFeed();
  const messages = Array.from({ length: 120 }, (_, i) => chat(String(i)));
  const first = feed.update(messages, [timed]);
  expect(first).toHaveLength(120);
  expect(feed.update(messages, [timed])).toEqual(first);
  expect(feed.update([{ ...chat("119"), text: "edited" }], [timed])).toEqual([
    { ...chat("119"), text: "edited" },
    timed,
  ]);
});

it("keeps distinct sources with matching IDs and ignores old source preferences", () => {
  expect(new CommentFeed().update([chat("moment")], [timed])).toHaveLength(2);
  expect(normalizePreferences({ source: "timestamps", theme: "sakura" })).not.toHaveProperty(
    "source",
  );
  expect(normalizePreferences({ source: "chat", theme: "sakura" }).theme).toBe("sakura");
});
