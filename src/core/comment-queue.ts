import type { Message } from "./types";

export class CommentQueue {
  private entries: { message: Message; at: number }[] = [];
  get length() {
    return this.entries.length;
  }
  sync(current: Map<string, Message>, fresh: Message[], time: number) {
    this.entries = this.entries.flatMap((entry) => {
      const message = current.get(commentKey(entry.message));
      return message ? [{ ...entry, message }] : [];
    });
    this.entries.push(...fresh.map((message) => ({ message, at: time })));
    this.entries = this.entries.slice(-60);
    this.expire(time);
  }
  expire(time: number) {
    this.entries = this.entries.filter(({ at }) => time >= at && time - at < 5);
  }
  take(time: number) {
    this.expire(time);
    return this.entries.shift()?.message;
  }
  clear() {
    this.entries = [];
  }
}

export function commentKey(message: Message) {
  return `${message.id}:${message.time ?? ""}`;
}
