import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const assets = "safari/Sideline/Sideline/Assets.xcassets/AppIcon.appiconset";
const catalog = JSON.parse(await readFile(`${assets}/Contents.json`, "utf8"));
const svg = await readFile("public/mark.svg", "utf8");
const browser = await chromium.launch({ channel: "chromium" });
try {
  for (const entry of catalog.images) {
    const size = Number.parseInt(entry.size, 10) * Number.parseInt(entry.scale, 10);
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%}body{display:grid;place-items:center}svg{width:84%;height:84%}</style>${svg}`,
    );
    await page.screenshot({ path: `${assets}/${entry.filename}`, omitBackground: true });
    if (size === 256) {
      await page.screenshot({
        path: "safari/Sideline/Sideline/Resources/Icon.png",
        omitBackground: true,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
