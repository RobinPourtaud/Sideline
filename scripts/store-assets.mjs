import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const output = resolve("docs/assets/v0.2.0");
const baseUrl = process.env.SIDELINE_ASSET_BASE_URL || "http://127.0.0.1:5199";
const font = (await readFile(`${output}/quicksand.ttf`)).toString("base64");
const scene = (await readFile(`${output}/coast-scene.png`)).toString("base64");
const mark = (await readFile("src/assets/sideline.svg", "utf8")).replaceAll(
  "currentColor",
  "#faf8f1",
);
const robin = (await readFile(`${output}/robin.svg`, "utf8")).replace(
  "<svg ",
  '<svg aria-hidden="true" ',
);
const icon = (await readFile("public/mark.svg")).toString("base64");
const references = new Map([
  [`data:font/ttf;base64,${font}`, "quicksand.ttf"],
  [`data:image/png;base64,${scene}`, "coast-scene.png"],
  [`data:image/svg+xml;base64,${icon}`, "../../../public/mark.svg"],
]);
const browser = await chromium.launch({ channel: "chromium" });
const stories = [
  {
    file: "01-scrolling",
    style: "scroll",
    title: "Conversation, in motion.",
    detail: "Smooth scrolling comments that move with your video.",
    label: "SCROLLING DANMAKU",
  },
  {
    file: "02-chat-box",
    style: "box",
    title: "Keep the good company.",
    detail: "Live chat and replay reactions in a box you can move and resize.",
    label: "CHAT BOX",
  },
  {
    file: "03-timed-comments",
    style: "bottom",
    title: "Meet the moment.",
    detail: "Timestamped reactions appear right when the video gets there.",
    label: "TIMESTAMPED COMMENTS",
  },
  {
    file: "04-customize",
    style: "box",
    title: "A little more you.",
    detail: "Four themes. Four display styles. Space and text that feel right.",
    label: "CUSTOMIZE YOUR VIEW",
  },
];

async function capture(
  story,
  theme = story.file === "04-customize" ? "light" : "dark",
  suffix = "",
) {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 700 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(
    (preferences) => localStorage.setItem("sideline", JSON.stringify(preferences)),
    {
      visible: false,
      displayStyle: story.style,
      theme,
      density: 3,
      overlayFontSize: 32,
      fontSize: 18,
      opacity: 100,
      width: 350,
      height: 430,
      x: 0.97,
      y: 0.35,
    },
  );
  await page.goto(`${baseUrl}/tests/fixtures/watch.html`);
  await page.getByRole("button", { name: "Open Sideline", exact: true }).waitFor();
  await page.addStyleTag({
    content: `main{max-width:none;width:1200px;margin:0;padding:0}#movie_player{width:1152px;max-width:none;height:500px;background-image:url(data:image/png;base64,${scene});background-size:cover;background-position:center}body>header,main>.eyebrow,#fullscreen{display:none}.scene{padding:22px;justify-content:end}.scene span{font:11px system-ui;letter-spacing:.4px;color:white;width:max-content;background:#103e45cc;padding:6px 10px;border-radius:4px}`,
  });
  await page.locator(".scene").evaluate((node) => {
    node.replaceChildren();
    const label = document.createElement("span");
    label.textContent = "DEMO SCENE · SYNTHETIC COMMENTS";
    node.append(label);
  });
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root, style) => {
      root.replaceChildren();
      const lines =
        style === "scroll"
          ? [
              ["Mika", "What a view"],
              ["Sam", "That light ✨"],
              ["Ari", "Hello from Kyoto 👋"],
            ]
          : [
              ["Mika", "What a view"],
              ["Sam", "That light ✨"],
              ["Ari", "Hello from Kyoto 👋"],
              ["Lee", "This is my kind of afternoon."],
            ];
      let index = 0;
      for (const [author, text] of lines) {
        const repeats = text === "What a view" ? 40 : 1;
        for (let i = 0; i < repeats; i++) {
          const message = root.ownerDocument.createElement("yt-live-chat-text-message-renderer");
          message.id = `demo-${index++}`;
          for (const [id, value] of [
            ["author-name", author],
            ["message", i % 2 ? "WHAT A VIEW!" : text],
          ]) {
            const span = root.ownerDocument.createElement("span");
            span.id = id;
            span.textContent = value;
            message.append(span);
          }
          root.append(message);
        }
      }
      if (style === "bottom") root.replaceChildren();
    }, story.style);
  if (story.style === "bottom") {
    await page.locator("ytd-comments").evaluate((root) => {
      root.innerHTML =
        '<ytd-comment-thread-renderer><span id="author-text">Mika</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0s">0:00</a> The light on the water is everything.</span><span id="vote-count-middle">128</span></ytd-comment-thread-renderer>';
    });
  }
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  const comment = page.locator(story.style === "box" ? ".message" : ".floating-comment");
  await comment.first().waitFor();
  if (story.style === "scroll") {
    await page.locator(".floating-comment").evaluateAll(async (nodes) => {
      const positions = [145, 450, 290];
      for (const [index, node] of nodes.entries()) {
        const animation = node.getAnimations()[0];
        await animation.ready;
        animation.currentTime = ((1152 - positions[index]) / 1152) * 12000;
      }
    });
  } else if (story.file === "04-customize") {
    await page.getByRole("button", { name: "Sideline settings", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).waitFor();
  } else if (story.style === "box") {
    await page.locator(".panel").hover();
  }
  if (story.style === "box") {
    await page.locator("sideline-overlay").evaluate(async (host) => {
      const animations = host.shadowRoot
        .getAnimations()
        .filter(
          (animation) => animation instanceof CSSAnimation || animation instanceof CSSTransition,
        );
      await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    });
    await page.locator(".feed").evaluate(async (node) => {
      node.scrollTop = 0;
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      node.scrollTop = 0;
    });
  }
  await page.locator("#movie_player").screenshot({
    path: `${output}/capture-${story.file}${suffix}.png`,
    animations: "allow",
  });
  await page.close();
  return `capture-${story.file}${suffix}.png`;
}

const common = `@font-face{font-family:Quicksand;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}html,body{margin:0}body{font-family:Quicksand,system-ui;background:#FAF8F1;color:#103E45}.brand{display:flex;align-items:center;gap:12px;font-size:25px;font-weight:700}.brand img{width:36px;height:36px}.top{display:flex;align-items:center;justify-content:space-between}.eyebrow{font:11px system-ui;letter-spacing:2px;font-weight:650}.footer{font:12px system-ui;letter-spacing:.4px;color:#46636A;display:flex;justify-content:space-between}h1{font-size:62px;line-height:1.08;letter-spacing:-2.5px;margin:28px 0 12px;font-weight:650}p{font-size:21px;line-height:1.5;margin:0;color:#46636A}.capture{display:block;width:100%;border-radius:16px;border:1px solid #103E4520;box-shadow:0 20px 45px #103E4512}`;

async function exportLayout(name, width, height, html, css = "") {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const source = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sideline · ${name}</title><style>${common}${css}</style><body>${html}</body></html>`;
  let editable = source;
  for (const [data, file] of references) editable = editable.replaceAll(data, file);
  await writeFile(`${output}/${name}.html`, editable);
  await page.setContent(source);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${output}/${name}.png`, omitBackground: false });
  await page.close();
}

async function embeddedCapture(file) {
  const data = `data:image/png;base64,${(await readFile(`${output}/${file}`)).toString("base64")}`;
  references.set(data, file);
  return data;
}
const brand = `<div class="brand"><img src="data:image/svg+xml;base64,${icon}" alt="">Sideline</div>`;

try {
  for (const [index, story] of stories.entries()) {
    const file = await capture(story);
    await exportLayout(
      story.file,
      1280,
      800,
      `<main><div class="top">${brand}<span class="eyebrow">${story.label}</span></div><h1>${story.title}</h1><p>${story.detail}</p><img class="capture" src="${await embeddedCapture(file)}" alt="Real Sideline interface"><div class="footer"><span>YouTube comments, on screen.</span><span>${String(index + 1).padStart(2, "0")} / 05 · Actual interface / demo scene</span></div></main>`,
      "main{padding:34px 64px}.capture{margin-top:24px}.footer{margin-top:19px}h1{font-size:58px}",
    );
  }
  const themes = [
    ["Forest", "dark"],
    ["Paper", "light"],
    ["Midnight", "midnight"],
    ["Sakura", "sakura"],
  ];
  const cards = [];
  for (const [name, theme] of themes) {
    const file = await capture(stories[1], theme, `-${theme}`);
    cards.push(
      `<div><img class="capture" src="${await embeddedCapture(file)}" alt="${name} theme"><strong>${name}</strong></div>`,
    );
  }
  await exportLayout(
    "05-themes",
    1280,
    800,
    `<main><div class="top">${brand}<span class="eyebrow">FOUR THEMES</span></div><h1>Feel at home.</h1><p>Forest, Paper, Midnight, or Sakura. Your view, your choice.</p><div class="grid">${cards.join("")}</div><div class="footer"><span>YouTube comments, on screen.</span><span>05 / 05 · Actual interface / demo scene</span></div></main>`,
    "main{padding:34px 64px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 28px;max-width:1020px;margin:24px auto 0}.grid img{border-radius:10px}.grid strong{display:block;font-size:17px;margin-top:9px}.footer{margin-top:20px}h1{font-size:58px}",
  );
  const scrolling = await embeddedCapture("capture-01-scrolling.png");
  await exportLayout(
    "readme-hero",
    1600,
    800,
    `<div class="copy">${brand}<div class="eyebrow intro">YOUTUBE COMMENTS, ON SCREEN.</div><h1>Comments,<br>in the<br>picture.</h1><p>Follow the conversation.<br>Stay with the video.</p><div class="tags">LIVE CHAT · REPLAYS · TIMED REACTIONS</div><div class="maker">${robin}<span>Made by <strong>Robin Pourtaud</strong> · Open source</span></div></div><div class="visual"><img class="capture" src="${scrolling}" alt="Sideline scrolling demo"><div class="visual-caption"><span>Quiet when you want it. Lively when you don’t.</span><span>v0.2.0</span></div></div>`,
    ".copy{position:absolute;left:78px;top:62px}.brand{font-size:31px}.brand img{width:44px;height:44px}.intro{margin-top:60px;color:#3F9290}h1{font-size:96px;line-height:1.03;letter-spacing:-4px;margin:23px 0 28px}p{font-size:25px}.tags{font:12px system-ui;letter-spacing:1.5px;margin-top:28px;color:#46636A}.maker{display:flex;align-items:center;gap:8px;font:14px system-ui;margin-top:44px;color:#46636A}.maker svg{width:32px;height:32px;flex:none}.maker strong{font-weight:600}.visual{position:absolute;left:630px;top:225px;width:1020px}.capture{border-radius:22px}.visual-caption{display:flex;justify-content:space-between;padding:25px 75px 0 5px;color:#46636A;font-size:19px}.visual-caption span:last-child{font:13px system-ui;padding-top:4px}",
  );
  const art = (small) =>
    `<div class="art ${small ? "small" : "wide"}"><div class="video"></div><div class="ribbon r1"><i></i><b></b><b></b></div><div class="ribbon r2"><i></i><b></b><b></b></div><div class="ribbon r3"><i></i><b></b><b></b></div></div>`;
  const artCss = `.art{position:absolute}.video{position:absolute;background:url(data:image/png;base64,${scene}) center/cover;box-shadow:0 20px 50px #061d2366;border:1px solid #ffffff40;border-radius:18px}.ribbon{position:absolute;background:#FAF8F1;color:#103E45;box-shadow:0 8px 24px #061d2330;border-radius:35px;height:56px;width:230px;padding:16px 24px 16px 64px}.ribbon i{position:absolute;left:20px;top:15px;width:26px;height:26px;background:#3F9290;border-radius:50%}.ribbon b{display:block;height:5px;width:100%;background:#103E45;border-radius:6px}.ribbon b+b{width:65%;margin-top:9px;opacity:.45}.r2{background:#DCEAE2}.r2 i{background:#E6B491}.r3{background:#C5D880}.small{left:56px;top:112px;width:340px;height:160px}.small .video{left:25px;top:8px;width:280px;height:134px;border-radius:12px}.small .ribbon{height:35px;width:143px;padding:10px 13px 10px 38px;box-shadow:0 5px 15px #061d2340}.small .ribbon i{left:12px;top:10px;width:15px;height:15px}.small .ribbon b{height:3px}.small .ribbon b+b{margin-top:6px}.small .r1{left:2px;top:1px}.small .r2{left:180px;top:54px}.small .r3{left:65px;top:113px}.wide{left:690px;top:60px;width:670px;height:440px}.wide .video{left:40px;top:30px;width:575px;height:350px}.wide .r1{left:0;top:75px}.wide .r2{left:400px;top:185px}.wide .r3{left:70px;top:310px}`;
  await exportLayout(
    "promo-small",
    440,
    280,
    `<div class="identity">${mark}<span>Sideline</span></div>${art(true)}`,
    `${artCss}body{background:#103E45;color:#FAF8F1}.identity{position:absolute;top:26px;left:82px;display:flex;align-items:center;gap:13px;font-size:42px;font-weight:650;letter-spacing:-1.5px}.identity svg{width:44px;height:44px}`,
  );
  await exportLayout(
    "promo-marquee",
    1400,
    560,
    `<div class="identity">${mark}<span>Sideline</span></div><h1>Comments,<br>in the picture.</h1><p>Follow the conversation.<br>Stay with the video.</p><div class="maker">${robin}<span>Made by <strong>Robin Pourtaud</strong></span></div>${art(false)}`,
    `${artCss}body{background:#103E45;color:#FAF8F1}.identity{position:absolute;top:55px;left:64px;display:flex;align-items:center;gap:15px;font-size:32px;font-weight:650}.identity svg{width:40px;height:40px}h1{position:absolute;top:128px;left:64px;font-size:70px;letter-spacing:-2.5px;line-height:1.08;margin:0}p{position:absolute;top:317px;left:68px;color:#DCEAE2;font-size:22px}.maker{position:absolute;left:68px;bottom:46px;display:flex;align-items:center;gap:8px;font:14px system-ui;color:#DCEAE2}.maker svg{width:32px;height:32px;flex:none}.maker strong{font-weight:600}`,
  );
  await exportLayout(
    "social-preview",
    1280,
    640,
    `<div class="copy">${brand}<h1>Comments,<br>in the picture.</h1><p>YouTube live chat and timed reactions.<br>Local processing. Open source.</p></div><img class="capture" src="${scrolling}" alt="Real Sideline demo">`,
    ".copy{position:absolute;left:62px;top:58px}.brand{font-size:28px}h1{font-size:76px;line-height:1.1;margin-top:65px}p{font-size:21px;margin-top:25px}.capture{position:absolute;left:595px;top:205px;width:830px}",
  );
  const preview = [
    ...stories.map((story) => [story.file, story.title]),
    ["05-themes", "Four themes"],
    ["readme-hero", "README hero"],
    ["promo-small", "Small promotional tile"],
    ["promo-marquee", "Marquee promotional tile"],
    ["social-preview", "GitHub social preview"],
  ];
  await writeFile(
    `${output}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sideline v0.2.0 · Asset review</title><style>@font-face{font-family:Quicksand;src:url(quicksand.ttf)}*{box-sizing:border-box}body{margin:0;background:#FAF8F1;color:#103E45;font:17px Quicksand,system-ui}main{max-width:1320px;padding:48px;margin:auto}h1{font-size:42px}p{line-height:1.6;color:#46636A}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{border:1px solid #DCEAE2;border-radius:16px;overflow:hidden;background:white}article img{display:block;width:100%;height:auto}article div{padding:20px}h2{font-size:22px}a{color:#3F9290}footer{margin-top:32px}@media(max-width:600px){main{padding:24px}.grid{grid-template-columns:1fr}h1{font-size:32px}}</style><main><h1>Sideline, ready for a new chapter.</h1><p>v0.2.0 · Five real-interface screenshots, promotional artwork, and a new README hero.<br>All comments are synthetic. The original video scene was generated; the interface was captured from Sideline.</p><div class="grid">${preview.map(([name, title]) => `<article><a href="${name}.png"><img src="${name}.png" alt="${title}"></a><div><h2>${title}</h2><a href="${name}.png">PNG</a> · <a href="${name}.html">Editable composition</a></div></article>`).join("")}</div><footer><a href="../../store-listing.md">Listing copy</a> · <a href="asset-brief.md">Provenance and export notes</a></footer></main></html>`,
  );
  console.log(`Exported store assets to ${output}`);
} finally {
  await browser.close();
}
