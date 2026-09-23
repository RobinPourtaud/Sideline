import { timestampFromLink } from "../core/timestamps";
import type { MessagePart } from "../core/types";
import { readParts } from "./media";

function sliceParts(parts: MessagePart[], start: number, end: number): MessagePart[] {
  const result: MessagePart[] = [];
  let offset = 0;
  for (const part of parts) {
    const next = offset + part.text.length;
    if (next > start && offset < end)
      result.push({ ...part, text: part.text.slice(Math.max(0, start - offset), end - offset) });
    offset = next;
    if (offset >= end) break;
  }
  return result;
}

export function readTimedComment(content: Element, videoId: string) {
  const references: { time: number; offset: number }[] = [];
  const parts = readParts(content, 4000, (link, offset) => {
    const time = timestampFromLink(link.getAttribute("href") ?? "", videoId);
    if (time !== undefined) references.push({ time, offset });
  });
  const fullText = parts.map((part) => part.text).join("");
  const sections = new Map<number, MessagePart[]>();
  for (const [index, reference] of references.entries()) {
    const section = sliceParts(
      parts,
      index === 0 ? 0 : reference.offset,
      references[index + 1]?.offset ?? fullText.length,
    );
    const previous = sections.get(reference.time);
    if (previous) previous.push({ text: "\n" }, ...section);
    else sections.set(reference.time, section);
  }
  return {
    text: fullText.trim(),
    entries: [...sections].map(([time, section]) => ({
      time,
      text: section
        .map((part) => part.text)
        .join("")
        .trim(),
      parts: section.some((part) => part.image) ? section : undefined,
    })),
  };
}
