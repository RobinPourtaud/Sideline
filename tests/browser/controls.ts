import type { Page } from "@playwright/test";

const names: Record<string, Record<string, string>> = {
  Appearance: { dark: "Forest", light: "Paper", midnight: "Midnight", sakura: "Sakura" },
  "Display as": { box: "Chat box", scroll: "Scrolling", top: "Top", bottom: "Bottom" },
  "Chat box size": { compact: "Small", comfortable: "Medium", large: "Large" },
  "Scrolling speed": { "6": "Fast", "12": "Normal", "20": "Slow" },
  Direction: { ltr: "Right →", rtl: "← Left" },
  "Translate into": { en: "English", fr: "French", de: "German" },
  "Comment language": { en: "English", ja: "Japanese" },
};
export async function chooseControl(page: Page, label: string, value: string) {
  const settings = page.getByRole("button", { name: "Sideline settings", exact: true });
  if ((await settings.getAttribute("aria-expanded")) !== "true") await settings.click();
  if (label === "Appearance" && value === "system") {
    const more = page
      .locator("details")
      .filter({ has: page.getByText("More controls", { exact: true }) });
    if (!(await more.evaluate((node) => (node as HTMLDetailsElement).open)))
      await page.getByText("More controls", { exact: true }).click();
    await page.getByRole("button", { name: "Match system theme", exact: true }).click();
    return;
  }
  const group = page.getByRole("radiogroup", {
    name: label === "Appearance" ? "Theme" : label,
    exact: true,
  });
  if (!(await group.isVisible())) {
    if (label === "Comment language" || label === "Translate into")
      await page.locator(`summary[aria-label="${label}"]`).click();
    else await page.getByText("More controls", { exact: true }).click();
  }
  await group.getByRole("radio", { name: names[label]?.[value] ?? value, exact: true }).click();
}
