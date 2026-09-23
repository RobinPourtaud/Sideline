import { element } from "./dom";
import css from "./launcher.css?inline";

export class Launcher {
  readonly host = document.createElement("sideline-launcher");
  private readonly tooltip = element("span", "player-tooltip");
  private active?: HTMLButtonElement;
  private hideTimer = 0;
  private player?: HTMLElement;
  private readonly cleanup = new AbortController();

  refresh() {
    if (!this.active) return;
    if (this.active.hidden) return this.hideTooltip();
    this.tooltip.textContent = this.active.getAttribute("aria-label");
    this.positionTooltip();
  }

  private hideTooltip() {
    clearTimeout(this.hideTimer);
    this.active?.removeAttribute("aria-describedby");
    this.active = undefined;
    this.tooltip.hidden = true;
  }

  private positionTooltip() {
    if (!this.active || !this.player) return;
    const host = this.host.getBoundingClientRect();
    const control = this.active.getBoundingClientRect();
    const player = this.player.getBoundingClientRect();
    this.tooltip.style.maxWidth = `${Math.max(0, Math.min(innerWidth, player.right) - Math.max(0, player.left) - 16)}px`;
    let left = control.left - host.left + control.width / 2;
    this.tooltip.style.left = `${left}px`;
    const tip = this.tooltip.getBoundingClientRect();
    const min = Math.max(8, player.left + 8);
    const max = Math.min(innerWidth - 8, player.right - 8);
    if (tip.left < min) left += min - tip.left;
    else if (tip.right > max) left -= tip.right - max;
    this.tooltip.style.left = `${left}px`;
  }

  dispose() {
    this.hideTooltip();
    this.cleanup.abort();
    this.host.remove();
  }

  constructor(button: HTMLButtonElement, settings: HTMLButtonElement) {
    const root = this.host.attachShadow({ mode: "open" });
    const style = element("style");
    style.textContent = css;
    this.tooltip.id = "sideline-player-tooltip";
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.hidden = true;
    root.append(style, button, settings, this.tooltip);
    for (const control of [button, settings]) {
      control.removeAttribute("title");
      const show = () => {
        this.hideTooltip();
        this.active = control;
        control.setAttribute("aria-describedby", this.tooltip.id);
        this.tooltip.hidden = false;
        this.refresh();
      };
      control.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "touch") show();
      });
      control.addEventListener("focus", show);
      control.addEventListener("pointerleave", () => {
        if (root.activeElement !== control)
          this.hideTimer = window.setTimeout(() => this.hideTooltip(), 120);
      });
      control.addEventListener("blur", () => this.hideTooltip());
      control.addEventListener("click", () => this.hideTooltip());
    }
    this.tooltip.addEventListener("pointerenter", () => clearTimeout(this.hideTimer));
    this.tooltip.addEventListener("pointerleave", () => {
      if (root.activeElement !== this.active) this.hideTooltip();
    });
    const options = { signal: this.cleanup.signal };
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") this.hideTooltip();
      },
      { ...options, capture: true },
    );
    window.addEventListener("resize", () => this.hideTooltip(), options);
    document.addEventListener("fullscreenchange", () => this.hideTooltip(), options);
    for (const event of [
      "keydown",
      "keyup",
      "keypress",
      "pointerdown",
      "pointerup",
      "click",
      "dblclick",
    ])
      root.addEventListener(event, (e) => e.stopPropagation());
  }

  mount(player: HTMLElement, fallback: ShadowRoot) {
    this.player = player;
    const controls = player.querySelector(".ytp-right-controls");
    const target = controls?.querySelector(".ytp-right-controls-left") ?? controls ?? fallback;
    this.host.dataset.modern = String(Boolean(controls?.querySelector(".ytp-right-controls-left")));
    const reference = controls?.querySelector<HTMLElement>(".ytp-settings-button");
    if (reference) {
      const size = getComputedStyle(reference);
      const svg = reference.querySelector("svg");
      const iconSize = svg ? Number.parseFloat(getComputedStyle(svg).width) : 24;
      for (const [key, value] of Object.entries({
        "--control-width": size.width,
        "--control-height": size.height,
        "--icon-size": `${iconSize}px`,
        "--mark-size": `${(iconSize * 4) / 3}px`,
      })) {
        if (this.host.style.getPropertyValue(key) !== value)
          this.host.style.setProperty(key, value);
      }
    }
    this.host.dataset.docked = String(Boolean(controls));
    if (this.host.parentNode !== target) target.prepend(this.host);
  }
}
