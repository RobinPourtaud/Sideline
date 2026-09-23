import type { Message } from "./types";

export class CommentFeed {
  private readonly entries = new Map<string, Message>();

  update(chat: readonly Message[], timed: readonly Message[]): Message[] {
    const next = new Map<string, Message>();
    for (const message of chat.slice(-120)) next.set(`chat:${message.id}`, message);
    for (const message of timed.slice(-30)) next.set(`timed:${message.id}`, message);
    for (const key of this.entries.keys()) if (!next.has(key)) this.entries.delete(key);
    for (const [key, message] of next) this.entries.set(key, message);
    return [...this.entries.values()].slice(-120);
  }

  reset() {
    this.entries.clear();
  }
}
