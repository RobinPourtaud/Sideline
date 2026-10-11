import { CommentFeed } from "../core/feed";
import { preferenceKeys, preferencePatch } from "../core/preference-storage";
import { defaults } from "../core/preferences";
import { activeComments } from "../core/timestamps";
import type { ChatSnapshot, Coverage, Message, Preferences } from "../core/types";
import { I18n } from "../i18n";
import { observePlayback, type Playback } from "../playback/clock";
import { Panel, type PanelState } from "../ui/panel";
import { ChatCollector } from "../youtube/chat";
import { ChatPresentation, NativeChatVisibility } from "../youtube/chat-presentation";
import { CommentPreloader } from "../youtube/comment-preload";
import { CommentCollector } from "../youtube/comments";

export interface PreferenceStore {
  languages?: readonly string[];
  read(): Promise<Preferences>;
  write(preferences: Preferences, patch?: Partial<Preferences>): Promise<void>;
  subscribe?(changed: (preferences: Preferences) => void): () => void;
}

export async function startApp(store: PreferenceStore): Promise<() => void> {
  const nativeChatVisibility = new NativeChatVisibility();
  nativeChatVisibility.setActive(location.pathname === "/watch");
  let preferences = { ...defaults };
  let storageFailed = false;
  try {
    preferences = await store.read();
  } catch {
    storageFailed = true;
  }
  nativeChatVisibility.setActive(preferences.visible && location.pathname === "/watch");
  let disposeSession: (() => void) | undefined;
  let currentVideo: HTMLVideoElement | null = null;
  let currentPlayer: HTMLElement | null = null;
  let currentId = "";
  let tickSession: (() => void) | undefined;
  let saveQueue = Promise.resolve();
  let navigating = false;
  let disposed = false;
  let applySession: ((next: Preferences) => void) | undefined;
  const pending = new Map<keyof Preferences, number>();
  const unsaved = new Set<keyof Preferences>();
  const acceptStored = (stored: Preferences) => {
    if (disposed) return;
    const next = { ...stored };
    for (const key of new Set([...pending.keys(), ...unsaved]))
      Object.assign(next, { [key]: preferences[key] });
    if (!Object.keys(preferencePatch(preferences, next)).length) return;
    if (applySession) applySession(next);
    else preferences = next;
  };

  const refresh = () => {
    const url = new URL(location.href);
    nativeChatVisibility.setActive(preferences.visible && url.pathname === "/watch");
    const id = url.pathname === "/watch" ? (url.searchParams.get("v") ?? "") : "";
    const pageVideoId = document.querySelector("ytd-watch-flexy")?.getAttribute("video-id");
    const ready = !navigating && (!pageVideoId || pageVideoId === id);
    const player = id && ready ? document.querySelector<HTMLElement>("#movie_player") : null;
    const video = player?.querySelector("video") ?? null;
    if (id !== currentId || video !== currentVideo || player !== currentPlayer) {
      disposeSession?.();
      disposeSession = undefined;
      tickSession = undefined;
      applySession = undefined;
      currentId = id;
      currentVideo = video;
      currentPlayer = player;
      if (id && video && player) {
        let chat: ChatSnapshot = { messages: [], available: false, mode: "" };
        let comments: Message[] = [];
        let coverage: Coverage = { threads: 0, references: 0, capped: false };
        let playback: Playback = {
          time: 0,
          duration: 0,
          seeking: false,
          ad: false,
          paused: true,
          rate: 1,
        };
        let fullscreenUnavailable = false;
        const i18n = new I18n(preferences.interfaceLanguage, store.languages);
        const feed = new CommentFeed();
        const chatPresentation = new ChatPresentation();
        const render = () => {
          if (!preferences.visible) return;
          const chatStatus = chat.available
            ? i18n.known(chat.mode)
            : chat.messages.length
              ? i18n.t("Chat unavailable · saved view")
              : i18n.t("Chat not loaded");
          const commentStatus = `${i18n.count(coverage.threads, "{count} thread", "{count} threads")} · ${i18n.count(coverage.references, "{count} timestamp", "{count} timestamps")}${coverage.capped ? ` · ${i18n.t("limit reached")}` : ""}`;
          const state: PanelState = {
            connected: chat.available || coverage.references > 0,
            status: `${chatStatus} · ${commentStatus}`,
            title: coverage.references
              ? i18n.t("Waiting for the next moment")
              : i18n.t("Comments, right here"),
            detail: fullscreenUnavailable
              ? i18n.t(
                  "YouTube unloaded its chat panel. Exit fullscreen to resume chat. Loaded timestamped comments still follow the video.",
                )
              : i18n.t(
                  "Open YouTube’s chat or scroll through its comments. Messages appear here together; timestamped comments join at their video time.",
                ),
            messages: feed.update(
              playback.seeking ? [] : chat.messages,
              playback.ad || playback.seeking
                ? []
                : activeComments(comments, playback.time, playback.duration),
              preferences.density,
              performance.now() / 1000,
            ),
          };
          panel.setPlayback(playback.paused, playback.rate, playback.time);
          panel.render(state);
          panel.setAd(playback.ad);
          chatPresentation.sync(preferences.visible, chat.available);
        };
        const preloader = new CommentPreloader((state) => {
          panel.setPreloadState(state.detail);
        }, i18n);
        const applyPreferences = (next: Preferences, local = false) => {
          const languageChanged = next.interfaceLanguage !== preferences.interfaceLanguage;
          const translationChanged =
            next.translationSource !== preferences.translationSource ||
            next.translationTarget !== preferences.translationTarget;
          preferences = next;
          nativeChatVisibility.setActive(preferences.visible);
          if (languageChanged || (!local && translationChanged)) {
            const customizing = panel.customizing;
            i18n.setLocale(next.interfaceLanguage);
            const mount = panel.host.parentElement ?? player;
            const translation = panel.releaseTranslation();
            if (translationChanged) translation?.stop();
            panel.dispose();
            panel = new Panel(mount, preferences, changePreferences, i18n, translation);
            if (preferences.visible && customizing) panel.openSettings(local);
            preloader.refreshLanguage();
          } else panel.setPreferences(next);
          tickSession?.();
          render();
        };
        const changePreferences = (next: Preferences) => {
          const patch = preferencePatch(preferences, next);
          const keys = preferenceKeys.filter((key) => Object.hasOwn(patch, key));
          for (const key of keys) pending.set(key, (pending.get(key) ?? 0) + 1);
          applyPreferences(next, true);
          saveQueue = saveQueue
            .then(async () => {
              await store.write(next, patch);
              for (const key of keys) unsaved.delete(key);
            })
            .catch(() => {
              for (const key of keys) unsaved.add(key);
              panel.storageError();
            })
            .finally(async () => {
              for (const key of keys) {
                const remaining = (pending.get(key) ?? 1) - 1;
                if (remaining) pending.set(key, remaining);
                else pending.delete(key);
              }
              if (store.subscribe && !disposed) {
                try {
                  acceptStored(await store.read());
                } catch {
                  panel.storageError();
                }
              }
            });
        };
        applySession = (next) => applyPreferences(next);
        let panel = new Panel(player, preferences, changePreferences, i18n);
        if (storageFailed) panel.storageError();
        const chatCollector = new ChatCollector(id, (next) => {
          if (!next.available && chat.available && document.fullscreenElement)
            fullscreenUnavailable = true;
          if (next.available) fullscreenUnavailable = false;
          chat = next.available ? next : { ...next, messages: chat.messages };
          render();
        });
        const commentCollector = new CommentCollector(id, (next, nextCoverage) => {
          comments = next;
          coverage = nextCoverage;
          render();
        });
        const stopClock = observePlayback(video, player, (next) => {
          if (next.seeking && !playback.seeking) {
            chat = { ...chat, messages: [] };
            feed.reset();
            panel.resetTimeline();
          }
          playback = next;
          render();
        });
        let collecting = false;
        tickSession = () => {
          const fullscreen = document.fullscreenElement;
          const mount =
            fullscreen instanceof HTMLElement &&
            fullscreen !== document.documentElement &&
            fullscreen !== document.body
              ? fullscreen
              : player;
          if (!(mount instanceof HTMLVideoElement)) panel.mount(mount);
          if (preferences.visible) {
            collecting = true;
            chatCollector.refresh();
            commentCollector.refresh();
          } else if (collecting) {
            collecting = false;
            chatCollector.dispose();
            commentCollector.dispose();
            chat = { messages: [], available: false, mode: "" };
            comments = [];
            coverage = { threads: 0, references: 0, capped: false };
            feed.reset();
            panel.resetTimeline();
          }
          chatPresentation.sync(preferences.visible, chat.available);
          preloader.sync(preferences.visible ? preferences.preloadComments : 0);
        };
        disposeSession = () => {
          preloader.dispose();
          chatPresentation.dispose();
          chatCollector.dispose();
          commentCollector.dispose();
          stopClock();
          panel.dispose();
        };
        render();
      }
    }
    tickSession?.();
  };
  const navigationStart = () => {
    navigating = true;
    refresh();
  };
  const navigationFinish = () => {
    navigating = false;
    refresh();
  };
  const interval = setInterval(refresh, 750);
  document.addEventListener("yt-navigate-start", navigationStart);
  document.addEventListener("yt-navigate-finish", navigationFinish);
  document.addEventListener("fullscreenchange", refresh);
  window.addEventListener("popstate", refresh);
  refresh();
  const unsubscribe = store.subscribe?.(acceptStored);
  if (unsubscribe)
    void store
      .read()
      .then(acceptStored)
      .catch(() => {});
  return () => {
    disposed = true;
    unsubscribe?.();
    clearInterval(interval);
    nativeChatVisibility.dispose();
    document.removeEventListener("yt-navigate-start", navigationStart);
    document.removeEventListener("yt-navigate-finish", navigationFinish);
    document.removeEventListener("fullscreenchange", refresh);
    window.removeEventListener("popstate", refresh);
    disposeSession?.();
  };
}
