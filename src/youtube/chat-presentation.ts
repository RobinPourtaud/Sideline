const marker = "data-sideline-native-chat";

export class ChatPresentation {
  private target?: HTMLElement;
  private previous?: { ariaHidden: string | null; inert: boolean };
  private readonly style = document.createElement("style");
  private attempted = new WeakSet<HTMLButtonElement>();
  private resizeObserver?: ResizeObserver;

  sync(active: boolean, available: boolean) {
    const frame = document.querySelector<HTMLIFrameElement>("iframe#chatframe");
    const chat =
      frame?.closest<HTMLElement>("ytd-live-chat-frame") ??
      document.querySelector<HTMLElement>("ytd-live-chat-frame");
    const target = chat?.closest<HTMLElement>("#chat-container") ?? chat ?? frame;
    if (!active || target !== this.target) this.restore();
    if (!active) {
      this.attempted = new WeakSet();
      return;
    }
    if (!available) {
      const control = chat?.querySelector<HTMLButtonElement>("#show-hide-button button");
      const unloaded = !frame?.getAttribute("src") || chat?.hasAttribute("collapsed");
      if (
        unloaded &&
        control &&
        !control.disabled &&
        control.getAttribute("aria-disabled") !== "true" &&
        control.getClientRects().length &&
        getComputedStyle(control).visibility === "visible" &&
        !this.attempted.has(control)
      ) {
        this.attempted.add(control);
        control.click();
      }
    }
    if (!target || this.target === target) return;
    const rect = target.getBoundingClientRect();
    this.target = target;
    this.previous = { ariaHidden: target.getAttribute("aria-hidden"), inert: target.inert };
    this.style.textContent = `[${marker}] {
      position: fixed !important; top: 0 !important; right: 0 !important; left: auto !important;
      width: ${Math.max(300, rect.width)}px !important;
      height: ${Math.max(400, rect.height)}px !important;
      margin: 0 !important; opacity: 0 !important; pointer-events: none !important;
    }
    :is(ytd-watch-flexy, ytd-watch-grid, ytd-watch-learning-journey)[fullscreen]:not([engagement-panel-expanded]):not([playlist-panel-expanded])
      #panels-full-bleed-container:has([${marker}]) {
      width: 0 !important; min-width: 0 !important; flex-basis: 0 !important;
    }`;
    document.documentElement.append(this.style);
    target.setAttribute(marker, "");
    target.setAttribute("aria-hidden", "true");
    target.inert = true;
    const player = document.querySelector("#movie_player");
    if (player) {
      // YouTube sizes the video inline and needs a resize signal after layout changes.
      this.resizeObserver = new ResizeObserver(() => window.dispatchEvent(new Event("resize")));
      this.resizeObserver.observe(player);
    }
  }

  private restore() {
    const concealed = Boolean(this.target);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (this.target && this.previous) {
      this.target.removeAttribute(marker);
      if (this.previous.ariaHidden === null) this.target.removeAttribute("aria-hidden");
      else this.target.setAttribute("aria-hidden", this.previous.ariaHidden);
      this.target.inert = this.previous.inert;
    }
    this.target = undefined;
    this.previous = undefined;
    this.style.remove();
    if (concealed) window.dispatchEvent(new Event("resize"));
  }

  dispose() {
    this.restore();
  }
}

export class NativeChatVisibility {
  private active?: boolean;
  private readonly style = document.createElement("style");
  private readonly observer = new MutationObserver(() => this.mount());

  constructor() {
    this.observer.observe(document, { childList: true });
    this.mount();
  }

  private mount() {
    if (!document.documentElement) return;
    document.documentElement.append(this.style);
    this.observer.disconnect();
  }

  setActive(active: boolean) {
    if (active === this.active) return;
    this.active = active;
    this.style.textContent = active
      ? `
      :is(ytd-watch-flexy, ytd-watch-grid, ytd-watch-learning-journey) :is(#chat-container, ytd-live-chat-frame) {
        opacity: 0 !important; pointer-events: none !important;
      }`
      : "";
  }

  dispose() {
    this.observer.disconnect();
    this.style.remove();
  }
}
