import { expect, it } from "vitest";
import { CommentQueue, commentKey } from "../../src/core/comment-queue";

const message = (id: string, text = id) => ({ id, text, author: "Viewer" });
it("drops waiting messages at five playback seconds without delaying fresh ones", () => {
  const queue = new CommentQueue();
  const old = message("old");
  const fresh = message("fresh");
  const current = new Map([old, fresh].map((item) => [commentKey(item), item]));
  queue.sync(current, [old], 10);
  queue.sync(current, [fresh], 14);
  expect(queue.take(15)).toEqual(fresh);
  expect(queue.take(15)).toBeUndefined();
});
it("keeps age across content updates and expires even when the source retains the message", () => {
  const queue = new CommentQueue();
  const original = message("a");
  queue.sync(new Map([[commentKey(original), original]]), [original], 0);
  const edit = message("a", "translated");
  queue.sync(new Map([[commentKey(edit), edit]]), [], 4);
  expect(queue.take(5)).toBeUndefined();
});
it("uses playback time so pauses freeze age and 2x playback advances the deadline", () => {
  const queue = new CommentQueue();
  const a = message("a");
  const current = new Map([[commentKey(a), a]]);
  queue.sync(current, [a], 20);
  for (let i = 0; i < 100; i++) queue.expire(20);
  expect(queue.length).toBe(1);
  queue.expire(24.9);
  expect(queue.length).toBe(1);
  queue.expire(25);
  expect(queue.length).toBe(0);
});
it("clears pending messages on timeline reset and bounds a burst", () => {
  const queue = new CommentQueue();
  const messages = Array.from({ length: 100 }, (_, i) => message(String(i)));
  queue.sync(new Map(messages.map((item) => [commentKey(item), item])), messages, 10);
  expect(queue.length).toBe(60);
  expect(queue.take(10)?.id).toBe("40");
  queue.clear();
  expect(queue.length).toBe(0);
});
