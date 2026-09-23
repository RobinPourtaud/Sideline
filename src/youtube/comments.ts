import { hashText } from "../core/timestamps";
import type { Coverage, Message } from "../core/types";
import { commentsSelector } from "./comment-preload";
import { readIdentity } from "./media";
import { readTimedComment } from "./timed-comment";

const maxThreads = 1000;

export class CommentCollector {
  private root: Element | null = null;
  private observer?: MutationObserver;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly identities = new WeakMap<Element, string>();
  private readonly threads = new Map<string, Message[]>();

  constructor(
    private readonly videoId: string,
    private readonly emit: (messages: Message[], coverage: Coverage) => void,
  ) {}

  refresh() {
    const root = document.querySelector(commentsSelector);
    if (root === this.root) return;
    this.observer?.disconnect();
    clearTimeout(this.timer);
    this.timer = undefined;
    this.root = root;
    if (root) {
      this.observer = new MutationObserver(() => {
        if (this.timer !== undefined) return;
        this.timer = setTimeout(() => {
          this.timer = undefined;
          this.scan();
        }, 250);
      });
      this.observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["src", "alt", "href"],
      });
    }
    this.scan();
  }

  private scan() {
    for (const thread of Array.from(
      this.root?.querySelectorAll("ytd-comment-thread-renderer") ?? [],
    ).slice(0, maxThreads)) {
      const content = thread.querySelector("#content-text");
      if (!content) {
        const previous = this.identities.get(thread);
        if (previous) this.threads.set(previous, []);
        continue;
      }
      const { text, entries } = readTimedComment(content, this.videoId);
      const identity = readIdentity(
        content.closest("ytd-comment-view-model, ytd-comment-renderer") ?? thread,
      );
      const author =
        thread.querySelector("#author-text")?.textContent?.trim().slice(0, 100) || "Viewer";
      const permalink = thread.querySelector<HTMLAnchorElement>('a[href*="lc="]');
      let id: string | null = null;
      try {
        id = permalink ? new URL(permalink.href).searchParams.get("lc") : null;
      } catch {
        id = null;
      }
      const previous = this.identities.get(thread);
      id ||= previous ?? hashText(`${author}\n${text}`);
      if (previous && previous !== id) this.threads.delete(previous);
      if (!this.threads.has(id) && this.threads.size >= maxThreads) continue;
      this.identities.set(thread, id);
      this.threads.set(
        id,
        entries.map((entry) => ({
          id: `${id}:${entry.time}`,
          author,
          ...entry,
          ...identity,
        })),
      );
    }
    const messages = [...this.threads.values()]
      .flat()
      .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    this.emit(messages, {
      threads: this.threads.size,
      references: messages.length,
      capped: this.threads.size >= maxThreads,
    });
  }

  dispose() {
    this.observer?.disconnect();
    clearTimeout(this.timer);
    this.threads.clear();
  }
}
