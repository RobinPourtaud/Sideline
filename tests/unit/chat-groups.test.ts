import { describe, expect, it } from "vitest";
import { ChatGroups } from "../../src/core/chat-groups";
import type { Message } from "../../src/core/types";

const chat = (id: string, text = "Hello"): Message => ({ id, text, author: id });

describe("chat grouping", () => {
  it("counts a burst once, regardless of repeated source snapshots", () => {
    const groups = new ChatGroups();
    const messages = Array.from({ length: 40 }, (_, i) => chat(String(i)));
    const result = groups.update(messages, 3, 0);
    expect(result).toEqual([{ ...messages[0], repeatCount: 39 }]);
    expect(groups.update(messages, 3, 4)).toEqual(result);
    expect(groups.update(messages, 3, 10)).toEqual(result);
  });

  it("ignores case, punctuation, symbols and Unicode presentation while preserving displayed text", () => {
    const messages = [
      chat("a", "  HELLO  world  "),
      chat("b", "hello\nworld"),
      chat("unicode", "Ｈｅｌｌｏ world"),
      chat("c", "Hello world!"),
      chat("d", "#Hello world™"),
      chat("e", "hello world..."),
      chat("f", "Hello world ❤️"),
      chat("g", "Hello world 👩‍💻"),
    ];
    expect(new ChatGroups().update(messages, 3, 0)).toEqual([{ ...messages[0], repeatCount: 7 }]);
  });

  it("does not merge unrelated symbol-only reactions into an empty group", () => {
    const messages = [chat("a", "!!!"), chat("b", "???"), chat("c", "🌱"), chat("d", "🌿")];
    const result = new ChatGroups().update([...messages, chat("e", "🌱")], 1, 0);
    expect(result).toHaveLength(4);
    expect(result[2]).toEqual({ ...messages[2], repeatCount: 1 });
  });

  it("case and symbol edits update the display without counting the message again", () => {
    const groups = new ChatGroups();
    groups.update([chat("a", "Hello!"), chat("b", "hello")], 3, 0);
    expect(groups.update([chat("a", "HELLO?!"), chat("b", "hello")], 3, 1)).toEqual([
      { ...chat("a", "HELLO?!"), repeatCount: 1 },
    ]);
  });

  it("separates custom emoji, paid messages, and membership messages", () => {
    const result = new ChatGroups().update(
      [
        { ...chat("a"), parts: [{ text: "Hello", image: "https://example.com/a" }] },
        { ...chat("b"), parts: [{ text: "Hello", image: "https://example.com/b" }] },
        { ...chat("c"), ungrouped: true },
        { ...chat("d"), ungrouped: true },
        chat("e"),
        { ...chat("f", "HELLO!"), parts: [{ text: "HELLO!", image: "https://example.com/a" }] },
      ],
      1,
      0,
    );
    expect(result).toHaveLength(5);
    expect(result[0]?.repeatCount).toBe(1);
  });

  it("ends a Balanced burst after five seconds even when repeats keep arriving", () => {
    const groups = new ChatGroups();
    groups.update([chat("a")], 3, 0);
    expect(groups.update([chat("a"), chat("b")], 3, 4)).toHaveLength(1);
    const result = groups.update([chat("a"), chat("b"), chat("c")], 3, 5);
    expect(result.map((message) => [message.id, message.repeatCount])).toEqual([
      ["a", 1],
      ["c", undefined],
    ]);
  });

  it("Quiet remembers recurring text across source eviction and expires after a quiet minute", () => {
    const groups = new ChatGroups();
    groups.update([chat("a")], 1, 0);
    expect(groups.update([], 1, 20)).toEqual([]);
    expect(groups.update([chat("b")], 1, 50)).toEqual([{ ...chat("b"), id: "a", repeatCount: 1 }]);
    expect(groups.update([chat("c")], 1, 100)[0]?.repeatCount).toBe(2);
    groups.update([chat("c")], 1, 159);
    expect(groups.update([chat("d")], 1, 160)).toEqual([{ ...chat("d"), repeatCount: undefined }]);
  });

  it("keeps a stable group identity when the first member leaves the loaded source", () => {
    const groups = new ChatGroups();
    groups.update([chat("a"), chat("b")], 3, 0);
    expect(groups.update([chat("b"), chat("c")], 3, 1)).toEqual([
      { ...chat("b"), id: "a", repeatCount: 2 },
    ]);
    expect(groups.update([], 3, 2)).toEqual([]);
  });

  it("moves edits out of their old group without ID collisions or counting an unchanged edit twice", () => {
    const groups = new ChatGroups();
    groups.update([chat("a"), chat("b")], 3, 0);
    const messages = [chat("a", "Goodbye"), chat("b")];
    const result = groups.update(messages, 3, 1);
    expect(result).toHaveLength(2);
    expect(new Set(result.map((message) => message.id)).size).toBe(2);
    expect(result.every((message) => !message.repeatCount)).toBe(true);
    expect(groups.update(messages, 3, 2)).toEqual(result);
  });

  it("Lively restores every message and switching modes rebuilds counts", () => {
    const groups = new ChatGroups();
    const messages = [chat("a"), chat("b")];
    expect(groups.update(messages, 1, 0)).toHaveLength(1);
    expect(groups.update(messages, 6, 1)).toEqual(messages);
    expect(groups.update(messages, 3, 2)).toEqual([{ ...messages[0], repeatCount: 1 }]);
    groups.reset();
    expect(groups.update([chat("b")], 3, 3)[0]?.repeatCount).toBeUndefined();
  });

  it("bounds remembered phrases and message IDs during sustained traffic", () => {
    const groups = new ChatGroups();
    groups.update([chat("first")], 1, 0);
    for (let i = 0; i < 1200; i++) groups.update([chat(`id-${i}`, `text-${i}`)], 1, 1);
    expect(groups.update([chat("last")], 1, 2)).toEqual([
      { ...chat("last"), repeatCount: undefined },
    ]);
    expect(groups.update([chat("id-0", "text-0")], 1, 3)[0]?.repeatCount).toBeUndefined();
  });
});
