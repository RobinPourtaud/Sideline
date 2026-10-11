import { ChatGroups } from "./chat-groups";
import type { Message } from "./types";

export class CommentFeed {
  private readonly entries = new Map<string, Message>();
  private readonly groups = new ChatGroups();

  update(chat: readonly Message[], timed: readonly Message[], density = 3, now = 0): Message[] {
    const next = new Map<string, Message>();
    for (const message of this.groups.update(chat.slice(-120), density, now))
      next.set(`chat:${message.id}`, message);
    for (const message of timed.slice(-30)) next.set(`timed:${message.id}`, message);
    for (const key of this.entries.keys()) if (!next.has(key)) this.entries.delete(key);
    for (const [key, message] of next) this.entries.set(key, message);
    return [...this.entries.values()].slice(-120);
  }

  reset() {
    this.entries.clear();
    this.groups.reset();
  }
}
