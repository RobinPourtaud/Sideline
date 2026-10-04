import { defaults } from "../core/preferences";
import type { Preferences } from "../core/types";
import { I18n, localeNames, type MessageKey } from "../i18n";
import { Choices } from "./choices";
import { button, element } from "./dom";

const boxSizes: Record<string, [number, number]> = {
  compact: [290, 320],
  comfortable: [330, 440],
  large: [420, 560],
};

export class DisplaySettings {
  readonly host = element("div", "display-settings");
  private readonly box = element("div");
  private readonly theme = element("div");
  private opacity?: HTMLElement;
  private opacityInput?: HTMLInputElement;
  private opacityOutput?: HTMLOutputElement;
  private systemTheme?: HTMLElement;
  private readonly floating = element("div");
  private readonly scrolling = element("div");
  private readonly motionControls = element("div");
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly motionChanged = () => this.update(this.preferences);
  private readonly groups = new Map<string, Choices>();
  private readonly textSize = element("input");
  private readonly sizeOutput = element("output");
  private preferences: Preferences;
  private languageMenu?: HTMLDetailsElement;

  constructor(
    preferences: Preferences,
    private readonly onChange: (patch: Partial<Preferences>, persist: boolean) => void,
    preload?: HTMLElement,
    private readonly i18n = new I18n(preferences.interfaceLanguage),
  ) {
    this.preferences = preferences;
    this.group(
      this.host,
      "Display as",
      "displayStyle",
      [
        ["box", "Chat box"],
        ["scroll", "Scrolling"],
        ["top", "Top"],
        ["bottom", "Bottom"],
      ],
      "style-choices",
    );
    this.group(
      this.theme,
      "Theme",
      "theme",
      [
        ["dark", "Forest"],
        ["light", "Paper"],
        ["midnight", "Midnight"],
        ["sakura", "Sakura"],
      ],
      "theme-choices",
    );
    this.host.append(this.theme);
    for (const [key, label, min, max, unit] of [
      ["fontSize", "Text size", 12, 32, "px"],
      ["opacity", "Background opacity", 10, 100, "%"],
    ] as const) {
      const wrapper = element("label", "setting range-setting");
      if (key === "opacity") this.opacity = wrapper;
      const heading = element("span", "setting-heading", this.i18n.t(label));
      const input = key === "fontSize" ? this.textSize : element("input");
      const output = key === "fontSize" ? this.sizeOutput : element("output");
      if (key === "opacity") {
        this.opacityInput = input;
        this.opacityOutput = output;
      }
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.value = String(preferences[key]);
      input.setAttribute("aria-label", this.i18n.t(label));
      output.textContent = `${input.value}${unit}`;
      const paint = () =>
        input.style.setProperty("--fill", `${((Number(input.value) - min) / (max - min)) * 100}%`);
      paint();
      input.addEventListener("input", () => {
        output.textContent = `${input.value}${unit}`;
        paint();
        const actual =
          key === "fontSize" && this.preferences.displayStyle !== "box" ? "overlayFontSize" : key;
        this.onChange({ [actual]: Number(input.value) }, false);
      });
      input.addEventListener("change", () => this.onChange({}, true));
      heading.append(output);
      wrapper.append(heading, input);
      this.host.append(wrapper);
    }
    const advanced = element("details", "advanced");
    advanced.append(element("summary", "", this.i18n.t("More controls")));
    this.group(this.box, "Chat box size", "boxSize", [
      ["compact", "Small"],
      ["comfortable", "Medium"],
      ["large", "Large"],
    ]);
    const reset = button(
      this.i18n.t("Reset panel position and size"),
      this.i18n.t("Reset position & size"),
      () =>
        this.onChange(
          { x: defaults.x, y: defaults.y, width: defaults.width, height: defaults.height },
          true,
        ),
    );
    reset.className = "text-button";
    this.box.append(reset);
    this.group(this.floating, "Comment density", "density", [
      ["1", "Quiet"],
      ["3", "Balanced"],
      ["6", "Lively"],
    ]);
    this.group(this.scrolling, "Scrolling area", "scrollArea", [
      ["top", "Top"],
      ["bottom", "Bottom"],
      ["full", "Full video"],
    ]);
    this.group(this.motionControls, "Direction", "direction", [
      ["rtl", "← Left"],
      ["ltr", "Right →"],
    ]);
    this.group(this.motionControls, "Scrolling speed", "speed", [
      ["20", "Slow"],
      ["12", "Normal"],
      ["6", "Fast"],
    ]);
    this.scrolling.append(this.motionControls);
    this.floating.append(this.scrolling);
    const system = button(
      this.i18n.t("Match system theme"),
      this.i18n.t("Match device theme"),
      () => this.onChange({ theme: "system" }, true),
    );
    system.className = "text-button";
    this.systemTheme = system;
    advanced.append(this.box, this.floating, system);
    this.group(advanced, "Auto-load comments", "preloadComments", [
      ["0", "Off"],
      ["100", "100"],
      ["300", "300"],
      ["500", "500"],
    ]);
    if (preload) advanced.append(preload);
    const language = element("details", "language-picker");
    this.languageMenu = language;
    const summary = element(
      "summary",
      "",
      `${this.i18n.t("Interface language")}: ${preferences.interfaceLanguage === "auto" ? this.i18n.t("Browser language") : localeNames[preferences.interfaceLanguage]}`,
    );
    summary.setAttribute("aria-label", this.i18n.t("Interface language"));
    const choices = new Choices(
      this.i18n.t("Interface language"),
      [["auto", this.i18n.t("Browser language")], ...Object.entries(localeNames)],
      (value) =>
        this.onChange({ interfaceLanguage: value as Preferences["interfaceLanguage"] }, true),
      "language-choices",
    );
    choices.update(preferences.interfaceLanguage);
    language.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && language.open) {
        event.stopPropagation();
        language.open = false;
        summary.focus({ preventScroll: true });
      }
    });
    language.append(summary, choices.host);
    advanced.append(language);
    this.host.append(advanced);
    this.update(preferences);
    this.reduced.addEventListener("change", this.motionChanged);
  }

  dispose() {
    this.reduced.removeEventListener("change", this.motionChanged);
  }

  focusLanguage() {
    const menu = this.languageMenu;
    if (menu?.parentElement instanceof HTMLDetailsElement) menu.parentElement.open = true;
    menu?.querySelector("summary")?.focus({ preventScroll: true });
  }

  private group(
    parent: HTMLElement,
    label: MessageKey,
    key: string,
    options: string[][],
    className = "",
  ) {
    const section = element("div", "setting choice-setting");
    const choices = new Choices(
      this.i18n.t(label),
      options.map(([value, text]) => [value!, this.i18n.known(text!)] as [string, string]),
      (value) => {
        if (key === "boxSize") {
          const size = boxSizes[value];
          if (size) this.onChange({ width: size[0], height: size[1] }, true);
        } else
          this.onChange(
            {
              [key]:
                key === "density" || key === "speed" || key === "preloadComments"
                  ? Number(value)
                  : value,
            },
            true,
          );
      },
      className,
    );
    this.groups.set(key, choices);
    section.append(element("span", "setting-heading", this.i18n.t(label)), choices.host);
    parent.append(section);
  }

  update(preferences: Preferences) {
    this.preferences = preferences;
    if (this.opacityInput && this.opacityOutput) {
      this.opacityInput.value = String(preferences.opacity);
      this.opacityInput.style.setProperty("--fill", `${((preferences.opacity - 10) / 90) * 100}%`);
      this.opacityOutput.textContent = `${preferences.opacity}%`;
    }
    const floating = preferences.displayStyle !== "box";
    const size = floating ? preferences.overlayFontSize : preferences.fontSize;
    this.textSize.value = String(size);
    this.textSize.style.setProperty("--fill", `${((size - 12) / 20) * 100}%`);
    this.sizeOutput.textContent = `${size}px`;
    for (const [key, choices] of this.groups)
      choices.update(
        key === "boxSize"
          ? (Object.entries(boxSizes).find(
              ([, size]) => size[0] === preferences.width && size[1] === preferences.height,
            )?.[0] ?? "custom")
          : String(preferences[key as keyof Preferences]),
      );
    const scrolling = preferences.displayStyle === "scroll" && !this.reduced.matches;
    this.motionControls.hidden = !scrolling;
    this.theme.hidden = scrolling;
    if (this.opacity) this.opacity.hidden = scrolling;
    if (this.systemTheme) this.systemTheme.hidden = scrolling;
    this.box.hidden = floating;
    this.floating.hidden = !floating;
    this.scrolling.hidden = preferences.displayStyle !== "scroll";
  }
}
