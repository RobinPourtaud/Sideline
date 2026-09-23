import type { I18n } from "../i18n";
import { element } from "./dom";
import { birdMark, mark } from "./mark";

export function aboutSection(i18n: I18n): HTMLDetailsElement {
  const about = element("details", "about-section");
  about.append(element("summary", "", i18n.t("About Sideline")));
  const identity = element("div", "about-identity");
  const name = element("div");
  name.append(
    element("strong", "", "Sideline"),
    element("p", "", i18n.t("YouTube comments, on screen.")),
  );
  identity.append(mark(document), name);
  const credit = element("a", "maker-credit");
  credit.href = "https://pourtaud.dev/";
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";
  credit.setAttribute("aria-label", i18n.t("Visit Robin Pourtaud’s website (new tab)"));
  const label = element("span");
  label.append(element("small", "", i18n.t("Made by")), element("span", "", "Robin Pourtaud"));
  const arrow = element("span", "credit-arrow", "↗");
  arrow.setAttribute("aria-hidden", "true");
  credit.append(birdMark(document), label, arrow);
  about.append(identity, credit);
  return about;
}
