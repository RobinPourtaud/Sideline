import { I18n, type MessageKey } from "../i18n";
export interface NativeTranslator {
  translate(text: string, options: { signal: AbortSignal }): Promise<string>;
  destroy(): void;
}
export interface TranslatorFactory {
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    signal: AbortSignal;
    monitor: (monitor: {
      addEventListener(
        type: "downloadprogress",
        listener: (event: { loaded: number }) => void,
      ): void;
    }) => void;
  }): Promise<NativeTranslator>;
}
export function nativeTranslator(): TranslatorFactory | undefined {
  const api = (globalThis as typeof globalThis & { Translator?: TranslatorFactory }).Translator;
  return typeof api?.create === "function" ? api : undefined;
}

export class TranslationSession {
  active = false;
  private statusMessage: MessageKey = "Off · translations stay on this device";
  private progress = 0;
  get status() {
    return this.i18n.t(this.statusMessage, { percent: this.progress });
  }
  setListener(changed: () => void) {
    this.changed = changed;
  }
  private translator?: NativeTranslator;
  private abort = new AbortController();
  private cache = new Map<string, string>();
  private pending: string[] = [];
  private running?: AbortSignal;
  private disposed = false;
  private setupTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly factory: TranslatorFactory,
    private changed: () => void,
    private readonly i18n = new I18n("en"),
  ) {
    this.statusMessage = "Off · translations stay on this device";
  }

  async start(sourceLanguage: string, targetLanguage: string) {
    if (this.disposed) return;
    this.stop();
    if (sourceLanguage === targetLanguage) {
      this.statusMessage = "Choose two different languages.";
      this.changed();
      return;
    }
    const signal = this.abort.signal;
    this.active = true;
    this.statusMessage = "Preparing translation…";
    const timeout = setTimeout(() => {
      if (signal.aborted) return;
      this.stop();
      this.statusMessage = "Translation setup timed out. Check your connection and try again.";
      this.changed();
    }, 60_000);
    this.setupTimer = timeout;
    try {
      // Call create before yielding so the browser receives the user's activation.
      const creation = this.factory.create({
        sourceLanguage,
        targetLanguage,
        signal,
        monitor: (monitor) =>
          monitor.addEventListener("downloadprogress", (event) => {
            if (signal.aborted) return;
            this.progress = Math.round(event.loaded * 100);
            this.statusMessage = "Downloading language pack… {percent}%";
            this.changed();
          }),
      });
      this.changed();
      const translator = await creation;
      if (signal.aborted) {
        translator.destroy();
        return;
      }
      this.translator = translator;
      this.statusMessage = "On-device translation on";
      this.changed();
      void this.pump();
    } catch {
      if (signal.aborted) return;
      this.stop();
      this.statusMessage =
        "Translation unavailable. Check the language pair and connection, then try again.";
      this.changed();
    } finally {
      clearTimeout(timeout);
      if (this.setupTimer === timeout) this.setupTimer = undefined;
    }
  }

  sync(texts: string[]) {
    this.pending = this.active
      ? [...new Set(texts.slice(-120))].filter((text) => !this.cache.has(text))
      : [];
    void this.pump();
  }

  get(text: string): string | undefined {
    return this.active ? this.cache.get(text) : undefined;
  }

  private async pump() {
    if (this.running || !this.translator || this.disposed) return;
    const translator = this.translator;
    const signal = this.abort.signal;
    this.running = signal;
    try {
      while (this.pending.length && !signal.aborted) {
        const text = this.pending.shift();
        if (text === undefined || this.cache.has(text)) continue;
        let translated = text;
        try {
          translated = await translator.translate(text, { signal });
        } catch {
          if (!signal.aborted)
            this.statusMessage = "Some comments couldn’t be translated. Showing originals.";
        }
        if (signal.aborted) break;
        this.cache.set(text, translated);
        if (this.cache.size > 256) {
          const oldest = this.cache.keys().next().value;
          if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.changed();
      }
    } finally {
      if (this.running === signal) {
        this.running = undefined;
        if (!this.disposed && this.pending.length && this.translator) void this.pump();
      }
    }
  }

  stop() {
    clearTimeout(this.setupTimer);
    this.setupTimer = undefined;
    this.abort.abort();
    this.running = undefined;
    this.translator?.destroy();
    this.translator = undefined;
    this.abort = new AbortController();
    this.active = false;
    this.pending = [];
    this.cache.clear();
    this.statusMessage = "Off · translations stay on this device";
  }

  dispose() {
    this.disposed = true;
    this.stop();
  }
}
