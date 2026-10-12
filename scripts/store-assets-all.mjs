import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { storeLocales } from "./store-locales.mjs";

const requested = process.argv.slice(2);
for (const locale of requested.length ? requested : Object.keys(storeLocales)) {
  if (!storeLocales[locale]) throw new Error(`Unsupported asset locale: ${locale}`);
  execFileSync(process.execPath, ["scripts/store-assets.mjs"], {
    env: { ...process.env, SIDELINE_ASSET_LOCALE: locale },
    stdio: "inherit",
  });
}

const output = "docs/assets/v0.2.0/localized";
await mkdir(output, { recursive: true });
const files = ["01-scrolling", "02-chat-box", "03-timed-comments", "04-customize", "05-themes"];
const sections = Object.entries(storeLocales).map(([locale, copy]) => {
  const path = locale === "en" ? ".." : locale;
  return `<section lang="${copy.language}" dir="${copy.direction}"><h2><a href="${path}/index.html">${copy.name}</a></h2><div class="grid">${files.map((file, index) => `<a href="${path}/${file}.png"><img loading="lazy" src="${path}/${file}.png" alt="${copy.stories[index][0]}"><span>${copy.stories[index][0]}</span></a>`).join("")}</div></section>`;
});
await writeFile(
  `${output}/index.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sideline · All screenshot languages</title><style>*{box-sizing:border-box}body{margin:0;background:#faf8f1;color:#103e45;font:17px system-ui}main{max-width:1600px;margin:auto;padding:40px}h1{font-size:36px}p{color:#46636a;line-height:1.5}section{margin-top:36px}a{color:inherit;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.grid a{background:white;border:1px solid #dceae2;border-radius:12px;overflow:hidden}.grid img{display:block;width:100%}.grid span{display:block;padding:15px;font-size:15px}</style><main><h1>Sideline, in ten languages.</h1><p>${Object.keys(storeLocales).length * 5} screenshots · 1280 × 800 · Actual localized interface and synthetic comments.<br>Includes a European Portuguese regional set. Each set also includes promotional artwork. English files are in the parent directory.</p>${sections.join("")}</main></html>`,
);
console.log(`Screenshot gallery updated. Review: ${output}/index.html`);
