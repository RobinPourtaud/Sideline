import { button, element } from "./dom";

export class Choices {
  readonly host = element("div", "choices");
  private readonly buttons = new Map<string, HTMLButtonElement>();

  constructor(
    label: string,
    options: readonly (readonly [string, string])[],
    change: (value: string) => void,
    className = "",
  ) {
    this.host.className = `choices ${className}`;
    this.host.setAttribute("role", "radiogroup");
    this.host.setAttribute("aria-label", label);
    for (const [value, name] of options) {
      const control = button(name, name, () => change(value));
      control.setAttribute("role", "radio");
      control.setAttribute("aria-checked", "false");
      control.dataset.value = value;
      control.tabIndex = -1;
      this.buttons.set(value, control);
      this.host.append(control);
      control.addEventListener("keydown", (event) => {
        const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const values = [...this.buttons.keys()];
        let direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        if (
          (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
          getComputedStyle(this.host).direction === "rtl"
        )
          direction *= -1;
        const index =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? values.length - 1
              : (values.indexOf(value) + direction + values.length) % values.length;
        const next = values[index];
        if (next) {
          change(next);
          this.buttons.get(next)?.focus();
        }
      });
    }
  }

  update(value: string) {
    const selected = this.buttons.has(value) ? value : this.buttons.keys().next().value;
    for (const [key, control] of this.buttons) {
      control.setAttribute("aria-checked", String(key === value));
      control.tabIndex = key === selected ? 0 : -1;
    }
  }
}
