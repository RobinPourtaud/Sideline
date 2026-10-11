import type { Message } from "./types";

interface Group {
  id: string;
  count: number;
  started: number;
  latest: number;
}

interface Arrival {
  key: string;
  group: Group;
}

export function chatGroupKey(message: Message) {
  const stripped = message.text.replace(/[\p{P}\p{S}\p{Variation_Selector}\u200d]/gu, "");
  const text = (stripped.trim() ? stripped : message.text)
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();
  return JSON.stringify([
    text,
    message.parts?.filter((part) => part.image).map((part) => part.image),
    message.sticker?.image,
    message.ungrouped ? message.id : undefined,
  ]);
}

export class ChatGroups {
  private readonly recent = new Map<string, Group>();
  private readonly arrivals = new Map<string, Arrival>();
  private mode = 0;
  private revision = 0;

  update(messages: readonly Message[], density: number, now: number): Message[] {
    const mode = density === 6 ? 6 : density <= 2 ? 1 : 3;
    if (mode !== this.mode) this.reset();
    this.mode = mode;
    if (mode === 6) return [...messages];
    const window = mode === 1 ? 60 : 5;
    for (const [key, group] of this.recent) {
      const age = now - (mode === 1 ? group.latest : group.started);
      if (age < 0 || age >= window) this.recent.delete(key);
    }
    const visible = new Map<Group, Message>();
    for (const message of messages) {
      const key = chatGroupKey(message);
      let arrival = this.arrivals.get(message.id);
      if (!arrival || arrival.key !== key) {
        if (arrival) {
          arrival.group.count--;
          if (!arrival.group.count && this.recent.get(arrival.key) === arrival.group)
            this.recent.delete(arrival.key);
        }
        let group = this.recent.get(key);
        if (!group) {
          group = {
            id:
              arrival && arrival.group.count > 0
                ? `${message.id}:edit:${++this.revision}`
                : message.id,
            count: 0,
            started: now,
            latest: now,
          };
        }
        group.count++;
        group.latest = now;
        this.recent.delete(key);
        this.recent.set(key, group);
        arrival = { key, group };
      }
      this.arrivals.delete(message.id);
      this.arrivals.set(message.id, arrival);
      if (!visible.has(arrival.group)) visible.set(arrival.group, message);
    }
    // Source snapshots repeat on playback ticks; only new IDs advance counts and memory.
    while (this.recent.size > 500) this.recent.delete(this.recent.keys().next().value!);
    while (this.arrivals.size > 1000) this.arrivals.delete(this.arrivals.keys().next().value!);
    return [...visible].map(([group, message]) => ({
      ...message,
      id: group.id,
      repeatCount: group.count > 1 ? group.count - 1 : undefined,
    }));
  }

  reset() {
    this.recent.clear();
    this.arrivals.clear();
    this.revision = 0;
  }
}
