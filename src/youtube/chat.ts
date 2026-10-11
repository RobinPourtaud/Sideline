import type { ChatSnapshot, Message } from "../core/types";
import { imageUrl, readIdentity, readParts } from "./media";

const selector =
  "yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer, yt-live-chat-membership-item-renderer, yt-live-chat-paid-sticker-renderer";
const limit = 120;

export function readChat(document: Document): ChatSnapshot {
  const root = document.querySelector("yt-live-chat-item-list-renderer #items");
  const mode =
    document
      .querySelector("yt-live-chat-header-renderer #view-selector")
      ?.textContent?.trim()
      .split("\n")[0] ||
    document.querySelector("yt-live-chat-header-renderer")?.textContent?.trim().split("\n")[0] ||
    (document.URL.includes("live_chat_replay") ? "Chat replay" : "Live chat");
  const messages = new Map<string, Message>();
  for (const item of Array.from(root?.querySelectorAll(selector) ?? []).slice(-limit)) {
    if (!item.id || item.hasAttribute("is-deleted") || item.querySelector("[is-deleted]")) continue;
    const body = item.querySelector("#message") ?? item.querySelector("#header-subtext");
    const parts = body ? readParts(body) : [];
    const stickerNode = item.querySelector("#sticker img, img#sticker");
    const stickerImage = imageUrl(stickerNode?.getAttribute("src") ?? null);
    const stickerLabel = (stickerNode?.getAttribute("alt") || "Super Sticker").slice(0, 120);
    const sticker = stickerImage ? { image: stickerImage, label: stickerLabel } : undefined;
    const text =
      parts
        .map((part) => part.text)
        .join("")
        .trim() || (item.tagName === "YT-LIVE-CHAT-PAID-STICKER-RENDERER" ? stickerLabel : "");
    if (!text) continue;
    messages.set(item.id, {
      id: item.id,
      author: item.querySelector("#author-name")?.textContent?.trim().slice(0, 100) || "Viewer",
      text,
      ungrouped: item.tagName !== "YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER" || undefined,
      ...readIdentity(item),
      parts: parts.some((part) => part.image) ? parts : undefined,
      sticker,
    });
  }
  return {
    messages: [...messages.values()],
    available: !!root,
    mode: mode.replace(/\s+/g, " ").trim().slice(0, 80),
  };
}

export class ChatCollector {
  private document?: Document;
  private observer?: MutationObserver;
  private timer?: ReturnType<typeof setTimeout>;
  private signature = "";

  constructor(
    private readonly videoId: string,
    private readonly emit: (snapshot: ChatSnapshot) => void,
  ) {}

  refresh() {
    let next: Document | undefined;
    try {
      const frame = document.querySelector<HTMLIFrameElement>("iframe#chatframe");
      next = frame?.contentDocument ?? undefined;
      for (const source of [frame?.src, next?.URL]) {
        if (!source) continue;
        const id = new URL(source).searchParams.get("v");
        if (id && id !== this.videoId) next = undefined;
      }
    } catch {
      next = undefined;
    }
    if (next === this.document) return;
    this.observer?.disconnect();
    clearTimeout(this.timer);
    this.timer = undefined;
    this.document = next;
    this.signature = "";
    if (next) {
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(next, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["is-deleted", "src", "alt", "href", "aria-label", "tooltip"],
      });
    }
    this.publish();
  }

  private schedule() {
    if (this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.publish();
    }, 100);
  }

  private publish() {
    const snapshot = this.document
      ? readChat(this.document)
      : { messages: [], available: false, mode: "" };
    const signature = JSON.stringify(snapshot);
    if (signature === this.signature) return;
    this.signature = signature;
    this.emit(snapshot);
  }

  dispose() {
    this.observer?.disconnect();
    clearTimeout(this.timer);
    this.timer = undefined;
    this.document = undefined;
  }
}
