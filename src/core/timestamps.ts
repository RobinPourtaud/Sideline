import type { Message } from "./types";

export function parseTimestamp(text: string): number | undefined {
  if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(text.trim())) return;
  const parts = text.trim().split(":").map(Number);
  if (parts.slice(1).some((part) => part > 59)) return;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function timestampFromLink(href: string, videoId: string): number | undefined {
  try {
    const url = new URL(href, "https://www.youtube.com");
    if (url.protocol !== "https:" || url.username || url.password || url.port) return;
    if (url.hostname !== "www.youtube.com" && url.hostname !== "youtube.com") return;
    if (url.pathname !== "/watch" || url.searchParams.get("v") !== videoId) return;
    const time = url.searchParams.get("t");
    if (!time || !/^\d+s?$/.test(time)) return;
    const seconds = Number.parseInt(time, 10);
    return Number.isSafeInteger(seconds) ? seconds : undefined;
  } catch {
    return;
  }
}

export function activeComments(comments: readonly Message[], time: number, duration: number) {
  if (!Number.isFinite(time) || time < 0) return [];
  return comments
    .filter((comment) => {
      const at = comment.time;
      return at !== undefined && at <= duration && at <= time && time - at < 8;
    })
    .slice(-30);
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const tail = String(total % 60).padStart(2, "0");
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${tail}`
    : `${minutes}:${tail}`;
}

export function hashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
