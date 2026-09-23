import { commentsSelector, preloadEvent } from "./comment-preload";

type Continuation = HTMLElement & {
  polymerController?: Continuation;
  data?: { trigger?: string; continuationEndpoint?: object };
  triggerContinuation?: () => void;
};

export function installCommentPreloadBridge() {
  const requested = new WeakSet<object>();
  const load = () => {
    if (location.pathname !== "/watch") return;
    const root = document.querySelector(commentsSelector);
    const node = [
      ...(root?.querySelectorAll<Continuation>("ytd-continuation-item-renderer") ?? []),
    ].find((item) => !item.closest("ytd-comment-thread-renderer"));
    const controller = node?.polymerController ?? node;
    const endpoint = controller?.data?.continuationEndpoint;
    if (
      !controller ||
      typeof controller.triggerContinuation !== "function" ||
      controller.data?.trigger !== "CONTINUATION_TRIGGER_ON_ITEM_SHOWN" ||
      !endpoint ||
      typeof endpoint !== "object" ||
      requested.has(endpoint)
    )
      return;
    requested.add(endpoint);
    try {
      // Invoke only YouTube’s existing comment loader; no caller-supplied commands cross worlds.
      controller.triggerContinuation();
    } catch {
      // The bounded preload operation reports a stall if YouTube changes its handler.
    }
  };
  document.addEventListener(preloadEvent, load);
  return () => document.removeEventListener(preloadEvent, load);
}
