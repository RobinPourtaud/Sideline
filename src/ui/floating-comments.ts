import type { Message, Preferences } from "../core/types";
import { element } from "./dom";
import { messageContent } from "./message";

interface Lane {
  node: HTMLElement;
  animation: Animation;
  id: string;
  content: string;
  index: number;
  width: number;
  start: number;
}

export class FloatingComments {
  readonly host = element("div", "floating-comments");
  private lanes = new Set<Lane>();
  private pending: Message[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private lastLaunch = 0;
  private seen = new Set<string>();
  private signature = "";
  private paused = true;
  private rate = 1;
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private latest?: { messages: Message[]; prefs: Preferences };
  private readonly motionChanged = () => this.refresh();
  private readonly resize = new ResizeObserver(() => this.refresh());
  private readonly contentResize = new ResizeObserver((entries) => {
    const prefs = this.latest?.prefs;
    if (!prefs || !this.scrolling(prefs)) return;
    for (const entry of entries) {
      const lane = [...this.lanes].find((item) => item.node === entry.target);
      if (!lane) continue;
      const width = lane.node.getBoundingClientRect().width;
      if (lane.width === width) continue;
      lane.width = width;
      this.updateMotion(lane, prefs);
    }
  });
  private refresh() {
    this.reset();
    if (this.latest) this.sync(this.latest.messages, this.latest.prefs);
  }

  constructor() {
    this.host.setAttribute("aria-hidden", "true");
    this.reduced.addEventListener("change", this.motionChanged);
    this.resize.observe(this.host);
  }

  sync(messages: Message[], prefs: Preferences) {
    this.latest = { messages, prefs };
    const signature = JSON.stringify([
      prefs.displayStyle,
      prefs.overlayFontSize,
      prefs.scrollArea,
      prefs.direction,
      prefs.speed,
      prefs.density,
    ]);
    if (signature !== this.signature) {
      this.reset();
      this.signature = signature;
    }
    this.host.hidden = !prefs.visible || prefs.displayStyle === "box";
    this.host.dataset.theme = prefs.theme;
    this.host.style.setProperty("--floating-size", `${prefs.overlayFontSize}px`);
    this.host.style.setProperty("--opacity", String(prefs.opacity / 100));
    if (this.host.hidden) {
      this.reset();
      return;
    }
    const current = new Map(messages.map((message) => [this.key(message), message]));
    const scrolling = this.scrolling(prefs);
    for (const lane of this.lanes) {
      const message = current.get(lane.id);
      if (!message) {
        if (!scrolling) this.remove(lane);
        continue;
      }
      const content = this.contentKey(message);
      if (lane.content === content) continue;
      lane.node.replaceChildren(messageContent(message, "floating-body", 180));
      lane.content = content;
      lane.width = lane.node.getBoundingClientRect().width;
      if (scrolling) this.updateMotion(lane, prefs);
    }
    this.pending = this.pending.flatMap((message) => current.get(this.key(message)) ?? []);
    const fresh = messages.filter((message) => !this.seen.has(this.key(message)));
    const count = this.laneCount(prefs);
    // Opening a video starts with a small preview, not the entire loaded chat history.
    this.pending.push(...(this.seen.size && scrolling ? fresh : fresh.slice(-count)));
    this.pending = this.pending.slice(-60);
    for (const message of messages) this.seen.add(this.key(message));
    while (this.seen.size > 1000) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.drain();
    if (!scrolling) this.pending = [];
  }

  private scrolling(prefs: Preferences) {
    return prefs.displayStyle === "scroll" && !this.reduced.matches;
  }

  private laneCount(prefs: Preferences) {
    const available = Math.max(0, this.host.clientHeight - 100);
    const area =
      prefs.displayStyle === "scroll" && prefs.scrollArea !== "full" ? available * 0.45 : available;
    return Math.min(prefs.density, Math.floor(area / (prefs.overlayFontSize * 1.5 + 8)));
  }

  private drain() {
    clearTimeout(this.timer);
    this.timer = undefined;
    const prefs = this.latest?.prefs;
    if (!prefs || this.host.hidden || this.host.clientWidth < 100) return;
    const scrolling = this.scrolling(prefs);
    const width = this.host.clientWidth;
    const velocity = width / (prefs.speed * 1000);
    const count = this.laneCount(prefs);
    while (this.pending.length && this.lanes.size < 60) {
      if (scrolling && !this.paused && performance.now() - this.lastLaunch < 180 / this.rate) break;
      let index = 0;
      for (; index < count; index++) {
        const tail = [...this.lanes].filter((lane) => lane.index === index).at(-1);
        if (!tail) break;
        const clearance = prefs.direction === "rtl" ? tail.width : -tail.start;
        if (scrolling && Number(tail.animation.currentTime ?? 0) * velocity >= clearance + 32)
          break;
      }
      if (index === count) break;
      const message = this.pending.shift()!;
      const node = element(
        "div",
        scrolling ? "floating-comment scrolling" : "floating-comment fixed",
      );
      node.append(messageContent(message, "floating-body", 180));
      node.dir = "auto";
      node.dataset.messageId = message.id;
      const bottom =
        prefs.displayStyle === "bottom" ||
        (prefs.displayStyle === "scroll" && prefs.scrollArea === "bottom");
      const lineHeight = prefs.overlayFontSize * 1.5 + 8;
      node.style.top = `${bottom ? this.host.clientHeight - 76 - (index + 1) * lineHeight : 24 + index * lineHeight}px`;
      if (!scrolling) node.style.maxWidth = `${Math.max(0, width - 32)}px`;
      this.host.append(node);
      const textWidth = node.getBoundingClientRect().width;
      const animation = node.animate([{ opacity: 1 }, { opacity: 1 }], {
        duration: 6000,
        fill: "both",
        easing: "linear",
      });
      const lane: Lane = {
        node,
        animation,
        index,
        width: textWidth,
        start: prefs.direction === "rtl" ? width : -textWidth,
        id: this.key(message),
        content: this.contentKey(message),
      };
      if (scrolling) this.updateMotion(lane, prefs);
      animation.playbackRate = this.rate;
      if (this.paused) animation.pause();
      this.lanes.add(lane);
      this.contentResize.observe(node);
      this.lastLaunch = performance.now();
      animation.onfinish = () => {
        this.remove(lane);
        this.drain();
      };
    }
    if (scrolling && this.pending.length && !this.paused && count)
      this.timer = setTimeout(() => this.drain(), 100);
  }

  private updateMotion(lane: Lane, prefs: Preferences) {
    const width = this.host.clientWidth;
    const end = prefs.direction === "rtl" ? -lane.width : width;
    const effect = lane.animation.effect as KeyframeEffect;
    effect.setKeyframes([
      { transform: `translateX(${lane.start}px)` },
      { transform: `translateX(${end}px)` },
    ]);
    effect.updateTiming({ duration: (Math.abs(end - lane.start) / width) * prefs.speed * 1000 });
  }

  private contentKey(message: Message) {
    return JSON.stringify([message.text, message.parts, message.sticker]);
  }

  private key(message: Message) {
    return `${message.id}:${message.time ?? ""}`;
  }

  setPlayback(paused: boolean, rate: number) {
    const changed = this.paused !== paused || this.rate !== rate;
    this.paused = paused;
    this.rate = rate;
    for (const { animation } of this.lanes) {
      animation.playbackRate = rate;
      if (paused) animation.pause();
      else animation.play();
    }
    if (changed) this.drain();
  }

  private remove(lane: Lane) {
    this.contentResize.unobserve(lane.node);
    lane.animation.onfinish = null;
    lane.animation.cancel();
    lane.node.remove();
    this.lanes.delete(lane);
  }

  clear() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = [];
    for (const lane of this.lanes) this.remove(lane);
  }
  reset() {
    this.clear();
    this.seen.clear();
    this.lastLaunch = 0;
  }
  dispose() {
    this.reset();
    this.resize.disconnect();
    this.contentResize.disconnect();
    this.reduced.removeEventListener("change", this.motionChanged);
    this.host.remove();
  }
}
