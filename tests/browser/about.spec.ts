import { expect, test } from "@playwright/test";

test("About stays at the end of settings and opens the maker website only on request", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://pourtaud.dev")) requests.push(request.url());
  });
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
  const about = page.locator("sideline-overlay .about-section");
  await expect(about).not.toHaveAttribute("open", "");
  expect(await about.evaluate((node) => node === node.parentElement?.lastElementChild)).toBe(true);
  await about.locator("summary").click();
  const link = about.getByRole("link", { name: "Visit Robin Pourtaud’s website (new tab)" });
  await expect(link).toHaveAttribute("href", "https://pourtaud.dev/");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(about.locator(".about-identity svg")).toHaveAttribute("viewBox", "0 0 64 64");
  await link.focus();
  await expect(link.locator(".robin-body")).not.toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(link.locator(".robin-body")).toHaveCSS("transform", "none");
  expect(requests).toEqual([]);
  await page
    .context()
    .route("https://pourtaud.dev/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>Maker website</title>" }),
    );
  const popup = page.waitForEvent("popup");
  await link.press("Enter");
  const website = await popup;
  await expect(website).toHaveURL("https://pourtaud.dev/");
  expect(await website.evaluate(() => window.opener)).toBeNull();
});
