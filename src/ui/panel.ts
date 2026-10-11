import { customizationBounds } from "../core/customization";
import { languages } from "../core/languages";
import { panelBounds } from "../core/preferences";
import type { Message, Preferences } from "../core/types";
import { I18n } from "../i18n";
import { nativeTranslator, TranslationSession } from "../translation/native";
import { aboutSection } from "./about";
import { Choices } from "./choices";
import { DisplaySettings } from "./display-settings";
import { button, element } from "./dom";
import { FloatingComments } from "./floating-comments";
import { attachInteraction } from "./interaction";
import { Launcher } from "./launcher";
import { mark, settingsMark } from "./mark";
import { messageRow } from "./message";
import css from "./panel.css?inline";

export interface PanelState {
  status: string;
  connected: boolean;
  title: string;
  detail: string;
  messages: Message[];
}

export class Panel {
  readonly host = document.createElement("sideline-overlay");
  private readonly root = this.host.attachShadow({ mode: "open" });
  private readonly panel = element("section", "panel");
  private readonly launcher: HTMLButtonElement;
  private readonly playerSettings: HTMLButtonElement;
  private readonly feed = element("div", "feed");
  private readonly list = element("ol", "messages");
  private readonly empty = element("div", "empty");
  private readonly emptyTitle = element("h2", "empty-title");
  private readonly emptyDetail = element("p", "empty-detail");
  private readonly statusText = element("span");
  private readonly dot = element("span", "dot");
  private readonly footer = element("footer", "footer");
  private readonly settings = element("div", "settings");
  private readonly customization = element("section", "customization");
  private readonly floating: FloatingComments;
  private readonly activation: Launcher;
  private readonly translationSettings = element("details", "advanced");
  private displaySettings?: DisplaySettings;
  private playbackPaused = true;
  private playbackRate = 1;
  private playbackTime = 0;
  private readonly notice = element("p", "notice");
  private readonly observer: ResizeObserver;
  private readonly resize: HTMLButtonElement;
  private following = true;
  private feedSize = "";
  private settingsOpen = false;
  private lastMessages = "";
  private latest?: PanelState;
  private area = { width: 0, height: 0 };
  private preferences: Preferences;
  private translation?: TranslationSession;
  private translationButton?: HTMLButtonElement;
  private readonly translationStatus = element("p", "settings-note");
  private readonly preloadStatus = element("p", "settings-note");

  constructor(
    parent: HTMLElement,
    preferences: Preferences,
    private readonly onChange: (preferences: Preferences) => void,
    private readonly i18n = new I18n(preferences.interfaceLanguage),
    translation?: TranslationSession,
  ) {
    this.preferences = { ...preferences };
    this.floating = new FloatingComments(this.i18n);
    this.host.lang = this.i18n.locale;
    this.host.dir = this.i18n.direction;
    const changed = () => {
      this.updateTranslationControls();
      if (this.latest) this.render(this.latest);
    };
    const factory = nativeTranslator();
    this.translation =
      translation ?? (factory ? new TranslationSession(factory, changed, this.i18n) : undefined);
    this.translation?.setListener(changed);
    const style = element("style");
    style.textContent = css;
    this.root.append(style);
    this.panel.setAttribute("aria-label", this.i18n.t("Sideline comments"));
    const help = element(
      "p",
      "sr-only",
      this.i18n.t("Use arrow keys to move or resize. Hold Shift for larger steps."),
    );
    help.id = "sideline-help";
    this.launcher = button(this.i18n.t("Open Sideline"), "", () => {
      this.settingsOpen = false;
      this.update({ visible: !this.preferences.visible }, true);
    });
    this.launcher.className = "launcher";
    this.launcher.append(mark(document));
    this.playerSettings = button(this.i18n.t("Sideline settings"), "", () => this.toggleSettings());
    this.playerSettings.append(settingsMark(document));
    this.activation = new Launcher(this.launcher, this.playerSettings);
    this.activation.host.lang = this.i18n.locale;
    this.activation.host.dir = this.i18n.direction;
    const header = element("header", "header");
    const move = button(this.i18n.t("Move panel"), "", () => {});
    move.className = "move";
    move.title = this.i18n.t("Drag to move · arrow keys also work");
    move.setAttribute("aria-describedby", help.id);
    move.append(mark(document), element("span", "brand", "Sideline"));
    const close = button(this.i18n.t("Hide Sideline"), "×", () => {
      this.settingsOpen = false;
      this.update({ visible: false }, true);
      this.launcher.focus({ preventScroll: true });
    });
    close.className = "icon-button";
    close.title = this.i18n.t("Hide all Sideline comments");
    header.append(move, close);
    const status = element("div", "status");
    status.append(this.dot, this.statusText);
    this.empty.append(this.emptyTitle, this.emptyDetail);
    this.feed.append(this.empty, this.list);
    this.feed.tabIndex = 0;
    this.feed.addEventListener(
      "scroll",
      () => {
        const size = `${this.feed.scrollHeight}:${this.feed.clientHeight}`;
        if (size !== this.feedSize && this.following) this.feed.scrollTop = this.feed.scrollHeight;
        else
          this.following =
            this.feed.scrollHeight - this.feed.scrollTop - this.feed.clientHeight < 48;
        this.feedSize = size;
      },
      { passive: true },
    );
    this.feed.setAttribute("role", "region");
    this.feed.setAttribute("aria-label", this.i18n.t("Comments"));
    this.list.setAttribute("aria-live", "off");
    const footer = this.footer;
    this.resize = button(this.i18n.t("Resize panel"), "⌟", () => {});
    this.resize.className = "resize";
    this.resize.title = this.i18n.t("Drag to resize · arrow keys also work");
    this.resize.setAttribute("aria-describedby", help.id);
    footer.append(this.resize);
    this.buildSettings();
    this.notice.hidden = true;
    this.notice.setAttribute("role", "status");
    const chrome = element("div", "chrome");
    const chromeContent = element("div", "chrome-content");
    chromeContent.append(header, status);
    chrome.append(chromeContent);
    const bottom = element("div", "bottom-chrome");
    bottom.append(footer);
    this.panel.append(help, chrome, this.feed, this.notice, bottom);
    this.customization.setAttribute("aria-label", this.i18n.t("Customize Sideline"));
    const settingsHeader = element("header", "header");
    const done = button(this.i18n.t("Done"), this.i18n.t("Done"), () => this.toggleSettings());
    done.className = "customize";
    settingsHeader.append(element("h2", "customization-title", this.i18n.t("Customize")), done);
    this.customization.append(settingsHeader, this.settings);
    this.root.append(this.floating.host, this.panel, this.customization);
    for (const event of [
      "keydown",
      "keyup",
      "keypress",
      "pointerdown",
      "pointerup",
      "click",
      "dblclick",
      "wheel",
    ]) {
      this.root.addEventListener(event, (e) => e.stopPropagation());
    }
    this.root.addEventListener("keydown", (event) => {
      const key = event as KeyboardEvent;
      if (key.key === "Escape" && this.settingsOpen) {
        key.preventDefault();
        this.toggleSettings();
      }
    });
    attachInteraction(
      move,
      "move",
      () => this.preferences,
      () => this.area,
      (patch, persist) => this.update(patch, persist),
      (active) => {
        this.panel.dataset.interacting = String(active);
      },
    );
    attachInteraction(
      this.resize,
      "resize",
      () => this.preferences,
      () => this.area,
      (patch, persist) => this.update(patch, persist),
      (active) => {
        this.panel.dataset.interacting = String(active);
      },
    );
    this.mount(parent);
    this.observer = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.target === this.host)) this.layout();
      if (this.following) this.feed.scrollTop = this.feed.scrollHeight;
    });
    this.observer.observe(this.host);
    this.observer.observe(this.feed);
    this.apply();
    this.layout();
    this.updateTranslationControls();
  }

  private update(patch: Partial<Preferences>, persist: boolean) {
    this.preferences = { ...this.preferences, ...patch };
    this.apply();
    this.layout();
    if (persist) this.onChange({ ...this.preferences });
    else if (this.latest) this.render(this.latest);
  }

  private apply() {
    const prefs = this.preferences;
    const floating = prefs.displayStyle !== "box";
    this.panel.hidden = !prefs.visible || floating;
    this.customization.hidden = !prefs.visible || !this.settingsOpen;
    this.activation.host.dataset.boxActive = String(prefs.visible && !floating);
    this.playerSettings.hidden = !prefs.visible;
    this.playerSettings.setAttribute("aria-expanded", String(this.settingsOpen));
    const label = prefs.visible ? this.i18n.t("Turn off Sideline") : this.i18n.t("Open Sideline");
    this.launcher.setAttribute("aria-label", label);
    this.activation.refresh();
    this.launcher.setAttribute("aria-pressed", String(prefs.visible));
    this.displaySettings?.update(prefs);
    this.panel.dataset.theme = prefs.theme;
    this.customization.dataset.theme = prefs.theme;
    this.panel.dataset.customizing = String(this.settingsOpen);
    this.panel.style.setProperty("--opacity", String(prefs.opacity / 100));
    this.panel.style.setProperty("--font-size", `${prefs.fontSize}px`);

    this.footer.hidden = this.settingsOpen;
    this.settings.hidden = !this.settingsOpen;
    this.feed.hidden = false;
    if (!prefs.visible || floating) {
      this.list.replaceChildren();
      this.lastMessages = "";
    }
    if (!prefs.visible) {
      this.floating.clear();
      this.translation?.sync([]);
    }
  }

  private layout() {
    this.area = { width: this.host.clientWidth, height: this.host.clientHeight };
    const arrangement = this.settingsOpen
      ? customizationBounds(this.preferences, this.area)
      : undefined;
    const bounds = arrangement?.panel ?? panelBounds(this.preferences, this.area);
    this.panel.dataset.stacked = String(arrangement?.side === "below");
    if (arrangement) {
      this.customization.dataset.side = arrangement.side;
      Object.assign(this.customization.style, {
        width: `${arrangement.settings.width}px`,
        height: `${arrangement.settings.height}px`,
        left: `${arrangement.settings.left}px`,
        top: `${arrangement.settings.top}px`,
      });
    }
    this.panel.style.setProperty("--panel-height", `${bounds.height}px`);
    Object.assign(this.panel.style, {
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
    });
  }

  openSettings(language = false) {
    if (!this.settingsOpen) this.toggleSettings();
    if (language) this.displaySettings?.focusLanguage();
  }

  get customizing() {
    return this.settingsOpen;
  }

  setPreferences(preferences: Preferences) {
    this.preferences = { ...preferences };
    if (!preferences.visible) this.settingsOpen = false;
    this.apply();
    this.layout();
  }

  private toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
    this.apply();
    this.layout();
    if (this.settingsOpen) this.focusSettings();
    else this.playerSettings.focus({ preventScroll: true });
  }

  private focusSettings() {
    this.settings
      .querySelector<HTMLButtonElement>('[role="radio"][tabindex="0"]')
      ?.focus({ preventScroll: true });
  }

  private buildSettings() {
    const preload = element("div", "setting");
    this.preloadStatus.textContent = this.i18n.t(
      "Loads automatically while Sideline is on. Keeps your sort order; replies stay collapsed.",
    );
    this.preloadStatus.setAttribute("role", "status");
    preload.append(this.preloadStatus);
    this.displaySettings = new DisplaySettings(
      this.preferences,
      (patch, persist) => this.update(patch, persist),
      preload,
      this.i18n,
    );
    this.settings.append(this.displaySettings.host);
    if (this.translation) {
      this.translationSettings.append(
        element("summary", "", this.i18n.t("Translation · on device")),
      );
      this.buildTranslationSettings();
      this.settings.append(this.translationSettings);
    }
    this.settings.append(aboutSection(this.i18n));
  }

  setPreloadState(detail: string) {
    this.preloadStatus.textContent = detail;
  }

  private updateTranslationControls() {
    this.translationStatus.textContent = this.translation?.status ?? "";
    const label = this.translation?.active
      ? this.i18n.t("Turn translation off")
      : this.i18n.t("Translate comments");
    if (this.translationButton) {
      this.translationButton.textContent = label;
      this.translationButton.setAttribute("aria-label", label);
      this.translationButton.setAttribute("aria-pressed", String(this.translation?.active));
    }
  }

  private buildTranslationSettings() {
    for (const [key, label] of [
      ["translationSource", this.i18n.t("Comment language")],
      ["translationTarget", this.i18n.t("Translate into")],
    ] as const) {
      const wrapper = element("details", "language-picker");
      const summary = element(
        "summary",
        "",
        `${label}: ${this.i18n.languageName(this.preferences[key])}`,
      );
      summary.setAttribute("aria-label", label);
      const choices = new Choices(
        label,
        Object.keys(languages).map(
          (code) => [code, this.i18n.languageName(code)] as [string, string],
        ),
        (value) => {
          this.translation?.stop();
          this.updateTranslationControls();
          choices.update(value);
          summary.textContent = `${label}: ${this.i18n.languageName(value)}`;
          wrapper.open = false;
          summary.focus({ preventScroll: true });
          this.update({ [key]: value }, true);
        },
        "language-choices",
      );
      choices.update(this.preferences[key]);
      wrapper.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && wrapper.open) {
          event.stopPropagation();
          wrapper.open = false;
          summary.focus({ preventScroll: true });
        }
      });
      wrapper.append(summary, choices.host);
      this.translationSettings.append(wrapper);
    }
    this.translationButton = button(
      this.i18n.t("Translate comments"),
      this.i18n.t("Translate comments"),
      () => {
        if (this.translation?.active) {
          this.translation.stop();
          this.updateTranslationControls();
          if (this.latest) this.render(this.latest);
        } else {
          void this.translation?.start(
            this.preferences.translationSource,
            this.preferences.translationTarget,
          );
        }
      },
    );
    this.translationButton.className = "reset";
    this.translationButton.setAttribute("aria-pressed", "false");
    this.translationStatus.setAttribute("role", "status");
    this.translationStatus.textContent = this.translation?.status ?? "";
    this.translationSettings.append(
      this.translationButton,
      this.translationStatus,
      element(
        "p",
        "settings-note",
        this.i18n.t(
          "For this video only. Your browser may download a language pack. Comments stay on your device. Mixed-language messages may translate poorly.",
        ),
      ),
    );
  }

  render(state: PanelState) {
    this.latest = state;
    if (!this.preferences.visible) return;
    this.floating.setPlayback(this.playbackPaused, this.playbackRate, this.playbackTime);
    this.statusText.textContent = state.status;
    this.dot.dataset.connected = String(state.connected);
    const messages = state.messages.slice(-120);
    this.emptyTitle.textContent = state.title;
    this.emptyDetail.textContent = state.detail;
    this.empty.hidden = messages.length > 0;
    this.translation?.sync(this.preferences.visible ? messages.map((message) => message.text) : []);
    this.floating.sync(
      messages.map((message) => {
        const translated = this.translation?.get(message.text);
        if (!translated || translated === message.text) return message;
        return {
          ...message,
          text: translated,
          parts: [{ text: translated }, ...(message.parts?.filter((part) => part.image) ?? [])],
        };
      }),
      this.preferences,
    );
    if (this.preferences.displayStyle !== "box") return;
    const signature = JSON.stringify(
      messages.map((message) => [message, this.translation?.get(message.text)]),
    );
    if (signature === this.lastMessages) return;
    this.lastMessages = signature;
    const follow = this.following;
    const previousScroll = this.feed.scrollTop;
    const fragment = document.createDocumentFragment();
    for (const message of messages) {
      fragment.append(
        messageRow(
          message,
          this.translation?.get(message.text),
          this.preferences.translationTarget,
          this.i18n,
        ),
      );
    }
    this.list.replaceChildren(fragment);
    this.feed.scrollTop = follow ? this.feed.scrollHeight : previousScroll;
  }

  storageError() {
    this.notice.hidden = false;
    this.notice.textContent = this.i18n.t(
      "Preferences couldn’t be saved. Changes will last for this page.",
    );
  }

  setPlayback(paused: boolean, rate: number, time = this.playbackTime) {
    this.playbackPaused = paused;
    this.playbackRate = rate;
    this.playbackTime = time;
    this.floating.setPlayback(paused, rate, time);
  }

  resetTimeline() {
    this.floating.reset();
  }

  setAd(ad: boolean) {
    this.host.style.display = ad ? "none" : "";
    this.activation.host.style.display = ad ? "none" : "";
    if (ad) this.floating.reset();
  }

  mount(parent: HTMLElement) {
    if (this.host.parentElement !== parent) parent.append(this.host);
    this.activation.mount(parent, this.root);
  }

  releaseTranslation() {
    const translation = this.translation;
    this.translation = undefined;
    return translation;
  }

  dispose() {
    this.displaySettings?.dispose();
    this.floating.dispose();
    this.translation?.dispose();
    this.observer.disconnect();
    this.activation.dispose();
    this.host.remove();
  }
}
