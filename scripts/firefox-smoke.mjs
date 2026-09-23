import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { firefox } from "@playwright/test";

const temporary = await mkdtemp(path.join(os.tmpdir(), "sideline-firefox-"));
const key = path.join(temporary, "key.pem");
const cert = path.join(temporary, "cert.pem");
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-days",
    "1",
    "-subj",
    "/CN=www.youtube.com",
  ],
  { stdio: "ignore" },
);
const fixture = (await readFile("tests/fixtures/watch.html", "utf8")).replace(
  '<script type="module" src="/tests/fixtures/watch.ts"></script>',
  "",
);
const chat = await readFile("tests/fixtures/chat.html", "utf8");
const server = https.createServer(
  { key: await readFile(key), cert: await readFile(cert) },
  (request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(request.url?.includes("chat.html") ? chat : fixture);
  },
);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const serverPort = server.address().port;
const proxy = http.createServer();
proxy.on("connect", (request, client, head) => {
  if (request.url !== `www.youtube.com:${serverPort}`) {
    client.destroy();
    return;
  }
  const upstream = net.connect(serverPort, "127.0.0.1", () => {
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) upstream.write(head);
    upstream.pipe(client);
    client.pipe(upstream);
  });
  upstream.on("error", () => client.destroy());
  client.on("error", () => upstream.destroy());
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const proxyPort = proxy.address().port;
const driverPort = Number(process.env.GECKODRIVER_PORT || 4445);
const driver = spawn(process.env.GECKODRIVER || "geckodriver", ["--port", String(driverPort)], {
  stdio: ["ignore", "pipe", "pipe"],
});
let driverLog = "";
driver.stdout.on("data", (chunk) => {
  driverLog += chunk;
});
driver.stderr.on("data", (chunk) => {
  driverLog += chunk;
});
driver.on("error", (error) => {
  driverLog += error.message;
});
async function command(method, endpoint, body) {
  const response = await fetch(`http://127.0.0.1:${driverPort}${endpoint}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data.value;
}
let session;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      await command("GET", "/status");
      ready = true;
      break;
    } catch {
      await delay(250);
    }
  }
  assert(ready, `geckodriver failed to start: ${driverLog}`);
  session = (
    await command("POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: "firefox",
          acceptInsecureCerts: true,
          proxy: {
            proxyType: "manual",
            sslProxy: `127.0.0.1:${proxyPort}`,
            httpProxy: `127.0.0.1:${proxyPort}`,
          },
          "moz:firefoxOptions": {
            binary: process.env.FIREFOX_BINARY || firefox.executablePath(),
            args: ["-headless"],
            prefs: { "full-screen-api.allow-trusted-requests-only": false },
          },
        },
      },
    })
  ).sessionId;
  const call = (method, endpoint, body) => command(method, `/session/${session}${endpoint}`, body);
  const script = (source) => call("POST", "/execute/sync", { script: source, args: [] });
  async function until(source) {
    for (let i = 0; i < 60; i++) {
      if (await script(source)) return;
      await delay(250);
    }
    throw new Error(`Condition timed out: ${source}`);
  }
  const addonId = await call("POST", "/moz/addon/install", {
    path: path.resolve(".output/firefox-mv3"),
    temporary: true,
  });
  assert.equal(addonId, "sideline@pourtaud.dev");
  await call("POST", "/url", { url: `https://www.youtube.com:${serverPort}/watch?v=fixture` });
  await until('return !!document.querySelector("sideline-overlay")');
  await script(
    'document.querySelector("sideline-overlay").shadowRoot.querySelector("sideline-launcher").shadowRoot.querySelector("button").click()',
  );
  await until(
    'return document.querySelector("sideline-overlay").shadowRoot.querySelectorAll(".message").length === 3',
  );
  await script(
    'const r=document.querySelector("sideline-overlay").shadowRoot;r.querySelector(".customize").click();r.querySelector(".theme-choices [data-value=light]").click();',
  );
  await script(`
    const root = document.querySelector("ytd-comments");
    const node = document.createElement("ytd-continuation-item-renderer");
    Object.assign(node, {
      data: {trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN", continuationEndpoint: {}},
      triggerContinuation() {
        for (let i = 0; i < 100; i++) root.append(document.createElement("ytd-comment-thread-renderer"));
        node.remove();
      }
    });
    root.append(node);
    document.querySelector("sideline-overlay").shadowRoot.querySelector('[aria-label="Auto-load comments"] [data-value="100"]').click();
  `);
  await until(
    'return document.querySelectorAll("ytd-comments ytd-comment-thread-renderer").length === 100',
  );
  await delay(250);
  await call("POST", "/refresh", {});
  await until(
    'return document.querySelector("sideline-overlay")?.shadowRoot.querySelector(".panel").dataset.theme === "light"',
  );
  await script('document.querySelector("#movie_player").requestFullscreen()');
  await until('return document.fullscreenElement?.id === "movie_player"');
  assert(
    await script(
      'return document.querySelector("sideline-overlay").shadowRoot.querySelector(".panel").getBoundingClientRect().width > 0',
    ),
  );
  await script('document.querySelector("#chatframe").src="about:blank"');
  await until(
    'return document.querySelector("sideline-overlay").shadowRoot.querySelector(".status").textContent.includes("Chat unavailable")',
  );
  await script(
    'document.querySelector("sideline-overlay").shadowRoot.querySelector(\'[aria-label="Interface language"] [data-value="ja"]\').click()',
  );
  await until('return document.querySelector("sideline-overlay").lang === "ja"');
  await call("POST", "/refresh", {});
  await until('return document.querySelector("sideline-overlay")?.lang === "ja"');
  await call("POST", "/moz/addon/uninstall", { id: addonId }).catch(() => {});
  console.log(
    "Firefox installed-extension smoke passed: injection, iframe collection, preload bridge, storage, fullscreen, source loss, saved interface language.",
  );
} catch (error) {
  console.error(driverLog.slice(-6000));
  throw error;
} finally {
  if (session) await command("DELETE", `/session/${session}`).catch(() => {});
  driver.kill();
  proxy.closeAllConnections();
  proxy.close();
  server.closeAllConnections();
  server.close();
  await rm(temporary, { recursive: true, force: true });
}
