import { chatGroupKey } from "../core/chat-groups";
import { CommentQueue, commentKey } from "../core/comment-queue";
import { type ScrollMotion, scrollMotion, scrollPosition } from "../core/danmaku-motion";
import type { Message, Preferences } from "../core/types";
import { I18n } from "../i18n";
import { element } from "./dom";
import { messageContent, messageCounts, updateMessageCounts } from "./message";

interface Lane {
  node: HTMLElement;
  animation: Animation;
  body: HTMLElement;
  counts: HTMLElement;
  id: string;
  content: string;
  groupKey?: string;
  countContent: string;
  index: number;
  width: number;
  motion?: ScrollMotion;
}

export class FloatingComments {
  readonly host = element("div", "floating-comments");
  private lanes = new Set<Lane>();
  private readonly pending = new CommentQueue();
  private playbackTime = 0;
  private width = 0;
  private height = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private lastLaunch = 0;
  private seen = new Set<string>();
  private signature = "";
  private paused = true;
  private rate = 1;
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private latest?: { messages: Message[]; prefs: Preferences };
  private readonly motionChanged = () => this.refresh();
  private readonly resize = new ResizeObserver(([entry]) => {
    if (entry) this.resizeTo(entry.contentRect.width, entry.contentRect.height);
  });
  private readonly contentResize = new ResizeObserver((entries) => {
    const prefs = this.latest?.prefs;
    if (!prefs || !this.scrolling(prefs)) return;
    for (const entry of entries) {
      const lane = [...this.lanes].find((item) => item.node === entry.target);
      if (!lane) continue;
      const width = entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width;
      if (lane.width === width) continue;
      lane.width = width;
      this.updateMotion(lane, prefs);
    }
  });
  private refresh() {
    this.reset();
    if (this.latest) this.sync(this.latest.messages, this.latest.prefs);
  }

  private resizeTo(width: number, height: number) {
    if (width <= 0 || height <= 0 || (width === this.width && height === this.height)) return;
    const initialized = this.width > 0 && this.height > 0;
    this.width = width;
    this.height = height;
    const prefs = this.latest?.prefs;
    if (!initialized || !prefs) return;
    if (!this.scrolling(prefs)) {
      this.refresh();
      return;
    }
    const count = this.laneCount(prefs);
    for (const lane of this.lanes) {
      if (lane.index >= count) this.remove(lane);
      else {
        this.positionLane(lane.node, lane.index, prefs);
        this.updateMotion(lane, prefs);
      }
    }
    this.drain();
  }

  constructor(private readonly i18n = new I18n("en")) {
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
    const wasHidden = this.host.hidden;
    const hidden = !prefs.visible || prefs.displayStyle === "box";
    if (this.host.hidden !== hidden) this.host.hidden = hidden;
    if (this.host.dataset.theme !== prefs.theme) this.host.dataset.theme = prefs.theme;
    const size = `${prefs.overlayFontSize}px`;
    const opacity = String(prefs.opacity / 100);
    if (this.host.style.getPropertyValue("--floating-size") !== size)
      this.host.style.setProperty("--floating-size", size);
    if (this.host.style.getPropertyValue("--opacity") !== opacity)
      this.host.style.setProperty("--opacity", opacity);
    if (this.host.hidden) {
      this.reset();
      return;
    }
    if (wasHidden || !this.width || !this.height)
      this.resizeTo(this.host.clientWidth, this.host.clientHeight);
    const current = new Map(messages.map((message) => [commentKey(message), message]));
    const scrolling = this.scrolling(prefs);
    const changedBodies: Lane[] = [];
    for (const lane of this.lanes) {
      const message = current.get(lane.id);
      if (!message) {
        if (!scrolling) this.remove(lane);
        continue;
      }
      const content = this.contentKey(message);
      if (lane.content !== content) {
        const groupKey = lane.groupKey === undefined ? undefined : chatGroupKey(message);
        if (groupKey === undefined || groupKey !== lane.groupKey) {
          const body = messageContent(message, "floating-body", 180);
          lane.body.replaceWith(body);
          lane.body = body;
          if (scrolling) changedBodies.push(lane);
        }
        lane.content = content;
        lane.groupKey = groupKey;
      }
      const countContent = this.countKey(message);
      if (lane.countContent !== countContent) {
        updateMessageCounts(lane.counts, message, this.i18n);
        lane.countContent = countContent;
      }
    }
    const widths = changedBodies.map((lane) => lane.node.getBoundingClientRect().width);
    for (const [index, lane] of changedBodies.entries()) {
      if (lane.width === widths[index]) continue;
      lane.width = widths[index]!;
      this.updateMotion(lane, prefs);
    }
    const fresh = messages.filter((message) => !this.seen.has(commentKey(message)));
    const count = this.laneCount(prefs);
    // Opening a video starts with a small preview, not the entire loaded chat history.
    this.pending.sync(
      current,
      this.seen.size && scrolling ? fresh : fresh.slice(-count),
      this.playbackTime,
    );
    for (const message of messages) this.seen.add(commentKey(message));
    while (this.seen.size > 1000) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.drain();
    if (!scrolling) this.pending.clear();
  }

  private scrolling(prefs: Preferences) {
    return prefs.displayStyle === "scroll" && !this.reduced.matches;
  }

  private laneCount(prefs: Preferences) {
    const available = Math.max(0, this.height - 100);
    const area =
      prefs.displayStyle === "scroll" && prefs.scrollArea !== "full" ? available * 0.45 : available;
    return Math.min(
      prefs.density === 6 ? 60 : prefs.density,
      Math.floor(area / (prefs.overlayFontSize * 1.5 + 8)),
    );
  }

  private drain() {
    clearTimeout(this.timer);
    this.timer = undefined;
    const prefs = this.latest?.prefs;
    if (!prefs || this.host.hidden || this.width < 100) return;
    const scrolling = this.scrolling(prefs);
    const width = this.width;
    const count = this.laneCount(prefs);
    this.pending.expire(this.playbackTime);
    while (this.pending.length && this.lanes.size < 60) {
      if (scrolling && !this.paused && performance.now() - this.lastLaunch < 180 / this.rate) break;
      let index = 0;
      for (; index < count; index++) {
        const tail = [...this.lanes].filter((lane) => lane.index === index).at(-1);
        if (!tail) break;
        if (scrolling && tail.motion) {
          const x = scrollPosition(tail.motion, Number(tail.animation.currentTime ?? 0));
          if (prefs.direction === "rtl" ? x + tail.width + 32 <= width : x >= 32) break;
        }
      }
      if (index === count) break;
      const message = this.pending.take(this.playbackTime);
      if (!message) break;
      const node = element(
        "div",
        scrolling ? "floating-comment scrolling" : "floating-comment fixed",
      );
      const body = messageContent(message, "floating-body", 180);
      const counts = messageCounts(
        message,
        this.i18n,
        scrolling && (message.time !== undefined || (prefs.density !== 6 && !message.ungrouped)),
      );
      node.append(body, counts);
      node.dir = "auto";
      node.dataset.messageId = message.id;
      this.positionLane(node, index, prefs);
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
        body,
        counts,
        index,
        width: textWidth,
        id: commentKey(message),
        content: this.contentKey(message),
        groupKey:
          scrolling && prefs.density !== 6 && message.time === undefined && !message.ungrouped
            ? chatGroupKey(message)
            : undefined,
        countContent: this.countKey(message),
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

  private positionLane(node: HTMLElement, index: number, prefs: Preferences) {
    const bottom =
      prefs.displayStyle === "bottom" ||
      (prefs.displayStyle === "scroll" && prefs.scrollArea === "bottom");
    const lineHeight = prefs.overlayFontSize * 1.5 + 8;
    node.style.top = `${bottom ? this.height - 76 - (index + 1) * lineHeight : 24 + index * lineHeight}px`;
  }

  private updateMotion(lane: Lane, prefs: Preferences) {
    const effect = lane.animation.effect as KeyframeEffect;
    const currentTime = lane.animation.currentTime;
    const motion = scrollMotion(
      this.width,
      lane.width,
      prefs.speed,
      prefs.direction,
      lane.motion ? { motion: lane.motion, time: Number(currentTime ?? 0) } : undefined,
    );
    lane.motion = motion;
    effect.setKeyframes([
      { transform: `translateX(${motion.start}px)` },
      { transform: `translateX(${motion.end}px)` },
    ]);
    effect.updateTiming({ duration: motion.duration });
    if (currentTime !== null) lane.animation.currentTime = currentTime;
  }

  private contentKey(message: Message) {
    return JSON.stringify([message.text, message.parts, message.sticker]);
  }

  private countKey(message: Message) {
    return JSON.stringify([message.repeatCount, message.likes]);
  }

  setPlayback(paused: boolean, rate: number, time = this.playbackTime) {
    if (time < this.playbackTime) this.reset();
    this.playbackTime = time;
    this.pending.expire(time);
    const changed = this.paused !== paused || this.rate !== rate;
    const rateChanged = this.rate !== rate;
    this.paused = paused;
    this.rate = rate;
    if (!changed) return;
    for (const { animation } of this.lanes) {
      if (rateChanged) animation.updatePlaybackRate(rate);
      if (paused && animation.playState !== "paused") animation.pause();
      else if (!paused && animation.playState !== "running") animation.play();
    }
    this.drain();
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
    this.pending.clear();
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
