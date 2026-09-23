import { describe, expect, it, vi } from "vitest";
import { normalizePreferences } from "../../src/core/preferences";
import { TranslationSession, type TranslatorFactory } from "../../src/translation/native";

const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
function setup() {
  const translate = vi.fn(async (text: string) => `Translated ${text}`);
  const destroy = vi.fn();
  const factory: TranslatorFactory = { create: vi.fn(async () => ({ translate, destroy })) };
  const changed = vi.fn();
  const session = new TranslationSession(factory, changed);
  return { session, factory, translate, destroy, changed };
}

describe("on-device translation", () => {
  it("validates saved languages and migrates old preferences", () => {
    expect(
      normalizePreferences({ translationSource: "constructor", translationTarget: "xx" }),
    ).toMatchObject({ translationSource: "ja", translationTarget: "en" });
    expect(
      normalizePreferences({ translationSource: "fr", translationTarget: "de" }),
    ).toMatchObject({ translationSource: "fr", translationTarget: "de" });
  });
  it("does no work before opt-in and deduplicates repeated text", async () => {
    const { session, factory, translate } = setup();
    session.sync(["a"]);
    expect(factory.create).not.toHaveBeenCalled();
    await session.start("ja", "en");
    session.sync(["a", "a", "b"]);
    await settle();
    session.sync(["a", "b"]);
    await settle();
    expect(translate).toHaveBeenCalledTimes(2);
    expect(session.get("a")).toBe("Translated a");
    session.dispose();
  });
  it("bounds bursts and replaces stale pending work", async () => {
    const { session, translate } = setup();
    let release!: (value: string) => void;
    translate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    await session.start("ja", "en");
    session.sync(Array.from({ length: 1000 }, (_, i) => String(i)));
    expect(translate.mock.calls[0]?.[0]).toBe("880");
    session.sync(["new"]);
    release("done");
    await settle();
    expect(translate.mock.calls.map((call) => call[0])).toEqual(["880", "new"]);
    session.dispose();
  });
  it("discards results after disable and destroys pending creation", async () => {
    const { session, translate, destroy, factory } = setup();
    let release!: (value: string) => void;
    translate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    await session.start("ja", "en");
    session.sync(["a"]);
    session.stop();
    release("stale");
    await settle();
    expect(session.get("a")).toBeUndefined();
    expect(destroy).toHaveBeenCalledOnce();
    let create!: (value: { translate: typeof translate; destroy: typeof destroy }) => void;
    vi.mocked(factory.create).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          create = resolve;
        }),
    );
    const start = session.start("ja", "fr");
    session.dispose();
    create({ translate, destroy });
    await start;
    expect(destroy).toHaveBeenCalledTimes(2);
  });
  it("retains originals on failures without retrying continuously", async () => {
    const { session, translate } = setup();
    translate.mockRejectedValue(new Error("unavailable"));
    await session.start("ja", "en");
    session.sync(["a"]);
    await settle();
    session.sync(["a"]);
    expect(translate).toHaveBeenCalledOnce();
    expect(session.get("a")).toBe("a");
    expect(session.status).toContain("originals");
    session.dispose();
  });
  it("handles unavailable language packs and same-language selection", async () => {
    const { session, factory } = setup();
    await session.start("en", "en");
    expect(factory.create).not.toHaveBeenCalled();
    vi.mocked(factory.create).mockRejectedValueOnce(new Error("unavailable"));
    await session.start("ja", "en");
    expect(session.active).toBe(false);
    expect(session.status).toContain("unavailable");
  });
  it("times out setup and safely destroys a translator that arrives afterward", async () => {
    vi.useFakeTimers();
    try {
      const { session, factory, translate, destroy } = setup();
      let release!: (value: { translate: typeof translate; destroy: typeof destroy }) => void;
      vi.mocked(factory.create).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      );
      const start = session.start("ja", "en");
      await vi.advanceTimersByTimeAsync(60_000);
      expect(session.active).toBe(false);
      expect(session.status).toContain("timed out");
      release({ translate, destroy });
      await start;
      expect(destroy).toHaveBeenCalledOnce();
      session.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

it("a restarted translator is not blocked by a cancelled request that never settles", async () => {
  const { session, translate } = setup();
  translate.mockImplementationOnce(() => new Promise(() => {}));
  await session.start("ja", "en");
  session.sync(["old"]);
  session.stop();
  await session.start("ja", "fr");
  session.sync(["new"]);
  await settle();
  expect(session.get("new")).toBe("Translated new");
  session.dispose();
});

it("does not create another translator after disposal", async () => {
  const { session, factory } = setup();
  session.dispose();
  await session.start("ja", "en");
  expect(factory.create).not.toHaveBeenCalled();
});

it("late completion from an old translator cannot unlock a newer request", async () => {
  const { session, translate } = setup();
  let releaseOld!: (value: string) => void;
  let releaseNew!: (value: string) => void;
  translate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        releaseOld = resolve;
      }),
  );
  translate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        releaseNew = resolve;
      }),
  );
  await session.start("ja", "en");
  session.sync(["old"]);
  await session.start("ja", "fr");
  session.sync(["new", "queued"]);
  releaseOld("stale");
  await settle();
  expect(translate).toHaveBeenCalledTimes(2);
  releaseNew("fresh");
  await settle();
  expect(session.get("old")).toBeUndefined();
  expect(session.get("new")).toBe("fresh");
  expect(session.get("queued")).toBe("Translated queued");
  session.dispose();
});
