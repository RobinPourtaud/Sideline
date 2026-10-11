import type { Preferences } from "./types";

export interface ScrollMotion {
  start: number;
  end: number;
  velocity: number;
  duration: number;
}

export function scrollPosition(motion: ScrollMotion, time: number) {
  return motion.start + motion.velocity * time;
}

export function scrollMotion(
  viewport: number,
  textWidth: number,
  speed: number,
  direction: Preferences["direction"],
  previous?: { motion: ScrollMotion; time: number },
): ScrollMotion {
  const velocity = (viewport / (speed * 1000)) * (direction === "rtl" ? -1 : 1);
  const start = previous
    ? scrollPosition(previous.motion, previous.time) - velocity * previous.time
    : direction === "rtl"
      ? viewport
      : -textWidth;
  const end = direction === "rtl" ? -textWidth : viewport;
  return { start, end, velocity, duration: Math.max(1, (end - start) / velocity) };
}
