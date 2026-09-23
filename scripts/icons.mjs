import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const source = await readFile(new URL("../src/assets/sideline.svg", import.meta.url), "utf8");
const svg = source
  .replace("</title>", '</title><rect width="64" height="64" rx="15" fill="#103e45"/>')
  .replaceAll("currentColor", "#faf8f1");
await writeFile(new URL("../public/mark.svg", import.meta.url), svg);
const browser = await chromium.launch(
  process.env.SIDELINE_CHROMIUM_BINARY
    ? { executablePath: process.env.SIDELINE_CHROMIUM_BINARY }
    : { channel: "chromium" },
);
try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0}svg{width:100%;height:100%;display:block}</style>${svg}`,
    );
    await page.screenshot({ path: `public/icons/${size}.png`, omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
