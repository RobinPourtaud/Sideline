import { I18n, type MessageKey } from "../i18n";
export const preloadEvent = "sideline:preload-comments";
export const commentsSelector = "ytd-comments:not([hidden]):not([disable-upgrade])";

export interface PreloadState {
  running: boolean;
  detail: string;
}

export class CommentPreloader {
  private stop?: () => void;
  private disposed = false;
  private target = 0;
  private state?: () => PreloadState;

  refreshLanguage() {
    if (this.state) this.emit(this.state());
  }

  private publish(state: () => PreloadState) {
    this.state = state;
    this.refreshLanguage();
  }

  constructor(
    private readonly emit: (state: PreloadState) => void,
    private readonly i18n = new I18n("en"),
  ) {}

  sync(target: number) {
    if (this.disposed || target === this.target) return;
    this.stop?.();
    this.target = target;
    if (!target) {
      this.publish(() => ({
        running: false,
        detail: this.i18n.t("Auto-load is off. Comments you load yourself still appear."),
      }));
      return;
    }
    const url = location.href;
    const started = Date.now();
    let lastProgress = started;
    let count = 0;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (reason: MessageKey) => {
      clearTimeout(timer);
      this.stop = undefined;
      if (!this.disposed)
        this.publish(() => ({
          running: false,
          detail: `${this.i18n.t(reason)} · ${this.i18n.count(count, "{count} comment loaded", "{count} comments loaded")}`,
        }));
    };
    this.stop = () => finish("Stopped");
    const step = () => {
      if (location.href !== url) {
        finish("Page changed");
        return;
      }
      const root = document.querySelector(commentsSelector);
      const rows = root?.querySelectorAll("ytd-comment-thread-renderer");
      if ((rows?.length ?? 0) > count) lastProgress = Date.now();
      count = rows?.length ?? 0;
      if (count >= target) {
        finish("Ready");
        return;
      }
      if (Date.now() - lastProgress >= 6000 || Date.now() - started >= 30000) {
        finish("YouTube stopped loading");
        return;
      }
      this.publish(() => ({
        running: true,
        detail: this.i18n.t("Loading {count}/{target} comments…", { count, target }),
      }));
      document.dispatchEvent(new Event(preloadEvent));
      timer = setTimeout(step, 500);
    };
    step();
  }

  dispose() {
    this.disposed = true;
    this.stop?.();
  }
}
