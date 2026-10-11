import { describe, expect, it } from "vitest";
import { scrollMotion, scrollPosition } from "../../src/core/danmaku-motion";

describe.each(["rtl", "ltr"] as const)("%s scrolling geometry", (direction) => {
  it("keeps long and short comments at the same speed and exits completely", () => {
    for (const viewport of [320, 960, 1920]) {
      const short = scrollMotion(viewport, 100, 12, direction);
      const long = scrollMotion(viewport, 1800, 12, direction);
      expect(short.velocity).toBe(long.velocity);
      expect(scrollPosition(long, long.duration)).toBeCloseTo(
        direction === "rtl" ? -1800 : viewport,
      );
      expect(Math.abs(scrollPosition(short, 1000) - short.start)).toBeCloseTo(viewport / 12);
    }
  });

  it("preserves position and spacing when screen width changes", () => {
    const leader = scrollMotion(960, 160, 12, direction);
    const follower = scrollMotion(960, 240, 12, direction);
    const distance = scrollPosition(leader, 5000) - scrollPosition(follower, 1500);
    for (const viewport of [320, 1920, 640]) {
      const nextLeader = scrollMotion(viewport, 160, 12, direction, { motion: leader, time: 5000 });
      const nextFollower = scrollMotion(viewport, 240, 12, direction, {
        motion: follower,
        time: 1500,
      });
      expect(scrollPosition(nextLeader, 5000)).toBeCloseTo(scrollPosition(leader, 5000));
      expect(scrollPosition(nextFollower, 1500)).toBeCloseTo(scrollPosition(follower, 1500));
      expect(scrollPosition(nextLeader, 5500) - scrollPosition(nextFollower, 2000)).toBeCloseTo(
        distance,
      );
    }
  });

  it("does not move a comment when genuine text edits change its width", () => {
    const before = scrollMotion(960, 100, 12, direction);
    const after = scrollMotion(960, 800, 12, direction, { motion: before, time: 2000 });
    expect(scrollPosition(after, 2000)).toBeCloseTo(scrollPosition(before, 2000));
    expect(after.velocity).toBe(before.velocity);
  });
});
