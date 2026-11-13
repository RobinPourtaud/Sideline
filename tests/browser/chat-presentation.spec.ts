import { expect, test } from "@playwright/test";

test("native chat is concealed without unloading and restored on hide or navigation", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.locator("#chatframe").evaluate((frame) => {
    frame.setAttribute("aria-hidden", "false");
    frame.setAttribute("style", "border: 2px solid red");
  });
  const frame = page.locator("#chatframe");
  await expect(frame).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(3);
  await expect(frame).toHaveCSS("opacity", "0");
  await expect(frame).toHaveAttribute("inert", "");
  await expect(frame).not.toHaveCSS("display", "none");
  await expect(frame).toHaveCSS("visibility", "visible");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const item = document.createElement("yt-live-chat-text-message-renderer");
      item.id = "hidden-source";
      item.innerHTML =
        '<span id="author-name">Viewer</span><span id="message">Still arriving</span>';
      root.append(item);
    });
  await expect(page.locator(".message")).toHaveCount(4);
  await page.locator(".panel").hover();
  await page.getByRole("button", { name: "Hide Sideline", exact: true }).click();
  await expect(frame).toHaveCSS("opacity", "1");
  await expect(frame).not.toHaveAttribute("inert");
  await expect(frame).toHaveAttribute("aria-hidden", "false");
  await expect(frame).toHaveAttribute("style", "border: 2px solid red");
  await expect(page.frameLocator("#chatframe").locator("#hidden-source")).toHaveCount(1);
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(frame).toHaveCSS("opacity", "0");
  await page.evaluate(() => {
    history.pushState({}, "", "/results?search_query=fixture");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await expect(frame).toHaveCSS("opacity", "1");
  await expect(frame).not.toHaveAttribute("inert");
});

test("activation opens the existing collapsed chat once and conceals its outer container", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.locator("#chatframe").evaluate((frame) => {
    const container = document.createElement("div");
    container.id = "chat-container";
    container.innerHTML =
      '<ytd-live-chat-frame collapsed><div id="show-hide-button"><button type="button">チャットを表示</button></div></ytd-live-chat-frame>';
    frame.replaceWith(container);
    const chat = container.firstElementChild!;
    const button = chat.querySelector("button")!;
    let clicks = 0;
    button.addEventListener("click", () => {
      container.dataset.clicks = String(++clicks);
      chat.removeAttribute("collapsed");
      const source = document.createElement("iframe");
      source.id = "chatframe";
      source.src = "/tests/fixtures/chat.html";
      chat.append(source);
    });
  });
  const container = page.locator("#chat-container");
  await expect(container).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(container).toHaveAttribute("data-clicks", "1");
  await expect(page.locator(".message")).toHaveCount(3);
  await expect(container).toHaveCSS("opacity", "0");
  await page.locator("video").evaluate((video) => {
    for (let i = 0; i < 10; i++) video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(container).toHaveAttribute("data-clicks", "1");
  await page.locator(".panel").hover();
  await page.getByRole("button", { name: "Hide Sideline", exact: true }).click();
  await expect(container).toHaveCSS("opacity", "1");
  await expect(page.locator("#chatframe")).toHaveCount(1);
});

for (const chatLocation of ["panel", "columns", "columns-with-hidden-panels"] as const) {
  for (const mode of ["fullscreen", "theater"] as const) {
    test(`${mode} reclaims a fixed player width with chat in ${chatLocation}`, async ({ page }) => {
      await page.goto("/tests/fixtures/watch.html");
      await page.locator("#chatframe").evaluate((frame, chatLocation) => {
        const watch = document.createElement("ytd-watch-flexy");
        watch.innerHTML =
          '<div id="full-bleed-container" style="display:flex;width:800px"><div id="player-full-bleed-container" style="flex:0 0 auto;width:500px;max-width:500px;min-width:0"></div><div id="panels-full-bleed-container" style="width:300px;min-width:300px"><div id="chat-container"></div></div></div>';
        const player = document.querySelector("#movie_player")!;
        player.before(watch);
        watch.querySelector("#player-full-bleed-container")!.append(player);
        (player as HTMLElement).style.width = "500px";
        window.addEventListener("resize", () => {
          (player as HTMLElement).dataset.resizedWidth = String(
            player.getBoundingClientRect().width,
          );
        });
        watch.querySelector("#chat-container")!.append(frame);
        if (chatLocation !== "panel") {
          const columns = document.createElement("div");
          columns.id = "columns";
          watch.append(columns);
          columns.append(watch.querySelector("#chat-container")!);
          if (chatLocation === "columns-with-hidden-panels") {
            watch.querySelector("#panels-full-bleed-container")!.innerHTML =
              '<div id="panels" style="display:none"><ytd-engagement-panel-section-list-renderer visibility="ENGAGEMENT_PANEL_VISIBILITY_HIDDEN"></ytd-engagement-panel-section-list-renderer></div><ytd-playlist-panel-renderer style="display:none"></ytd-playlist-panel-renderer>';
          }
        }
        document.addEventListener("fullscreenchange", () =>
          watch.toggleAttribute("fullscreen", Boolean(document.fullscreenElement)),
        );
      }, chatLocation);
      const column = page.locator("#panels-full-bleed-container");
      const playerArea = page.locator("#player-full-bleed-container");
      await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
      await expect(page.locator(".message")).toHaveCount(3);
      await expect(column).toHaveCSS("width", "300px");
      await page.locator("ytd-watch-flexy").evaluate((node, mode) => {
        if (mode === "fullscreen") return node.requestFullscreen();
        node.setAttribute("theater", "");
      }, mode);
      await expect(column).toHaveCSS("width", "0px");
      await expect(playerArea).toHaveCSS("width", "800px");
      await expect(page.locator("#movie_player")).toHaveAttribute("data-resized-width", "800");
      if (chatLocation === "columns-with-hidden-panels") {
        const engagement = page.locator("ytd-engagement-panel-section-list-renderer");
        await engagement.evaluate((node) =>
          node.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"),
        );
        await expect(column).toHaveCSS("width", "300px");
        await engagement.evaluate((node) =>
          node.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN"),
        );
        await expect(column).toHaveCSS("width", "0px");
      }
      await page
        .frameLocator("#chatframe")
        .locator("#items")
        .evaluate((root) => {
          const item = document.createElement("yt-live-chat-text-message-renderer");
          item.id = "fullscreen-source";
          item.innerHTML =
            '<span id="author-name">Viewer</span><span id="message">Fullscreen still receives chat</span>';
          root.append(item);
        });
      await expect(page.locator(".message")).toHaveCount(4);
      for (const attribute of ["engagement-panel-expanded", "playlist-panel-expanded"]) {
        await page
          .locator("ytd-watch-flexy")
          .evaluate((node, attribute) => node.setAttribute(attribute, ""), attribute);
        await expect(column).toHaveCSS("width", "300px");
        await expect(playerArea).toHaveCSS("width", "500px");
        await expect(page.locator("#movie_player")).toHaveCSS("width", "500px");
        await page
          .locator("ytd-watch-flexy")
          .evaluate((node, attribute) => node.removeAttribute(attribute), attribute);
        await expect(column).toHaveCSS("width", "0px");
        await expect(playerArea).toHaveCSS("width", "800px");
      }
      await page.locator("ytd-watch-flexy").evaluate((node, mode) => {
        if (mode === "fullscreen") return document.exitFullscreen();
        node.removeAttribute("theater");
      }, mode);
      await expect(column).toHaveCSS("width", "300px");
      await page.locator("ytd-watch-flexy").evaluate((node, mode) => {
        if (mode === "fullscreen") return node.requestFullscreen();
        node.setAttribute("theater", "");
      }, mode);
      await expect(column).toHaveCSS("width", "0px");
      await page.locator(".panel").hover();
      await page.getByRole("button", { name: "Hide Sideline", exact: true }).click();
      await expect(column).toHaveCSS("width", "300px");
      await expect(page.frameLocator("#chatframe").locator("#fullscreen-source")).toHaveCount(1);
      await expect(page.locator("#movie_player")).toHaveAttribute("data-resized-width", "500");
    });
  }
}

test("hidden fixed chat releases the column below the player and restores it when needed", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.locator("#chatframe").evaluate((frame) => {
    const watch = document.createElement("ytd-watch-flexy");
    watch.setAttribute("fixed-panels", "");
    watch.innerHTML =
      '<div id="columns" style="display:flex;width:800px;padding-right:300px"><div id="primary" style="flex:1;min-width:0">Video details</div><div id="chat-container" style="position:fixed"></div></div>';
    frame.before(watch);
    watch.querySelector("#chat-container")!.append(frame);
  });
  const primary = page.locator("#primary");
  const watch = page.locator("ytd-watch-flexy");
  await expect(primary).toHaveCSS("width", "500px");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await expect(primary).toHaveCSS("width", "800px");
  for (const attribute of ["engagement-panel-expanded", "playlist-panel-expanded"]) {
    await watch.evaluate((node, attribute) => node.setAttribute(attribute, ""), attribute);
    await expect(primary).toHaveCSS("width", "500px");
    await watch.evaluate((node, attribute) => node.removeAttribute(attribute), attribute);
    await expect(primary).toHaveCSS("width", "800px");
  }
  await page.locator(".panel").hover();
  await page.getByRole("button", { name: "Hide Sideline", exact: true }).click();
  await expect(primary).toHaveCSS("width", "500px");
  await expect(page.locator("#chatframe")).toHaveCount(1);
});

test("native chat is hidden before preferences resolve and late chat stays hidden until switched off", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/chat.html");
  await page.evaluate(() => {
    history.replaceState({}, "", "/watch?v=early");
    document.body.innerHTML =
      '<ytd-watch-flexy><div id="chat-container"><ytd-live-chat-frame></ytd-live-chat-frame></div></ytd-watch-flexy>';
  });
  const opacity = await page.evaluate(async () => {
    const appPath = "/src/browser/app.ts";
    const preferencesPath = "/src/core/preferences.ts";
    const { startApp } = await import(appPath);
    const { defaults } = await import(preferencesPath);
    let resolve: (value: unknown) => void;
    const read = new Promise((done) => {
      resolve = done;
    });
    const pending = startApp({ read: () => read, write: async () => {} });
    const result = getComputedStyle(document.querySelector("#chat-container")!).opacity;
    resolve!({ ...defaults, visible: true });
    (window as unknown as { dispose: () => void }).dispose = await pending;
    return result;
  });
  expect(opacity).toBe("0");
  const lateOpacity = await page.locator("#chat-container").evaluate((container) => {
    const next = container.cloneNode(true) as HTMLElement;
    container.replaceWith(next);
    return getComputedStyle(next).opacity;
  });
  expect(lateOpacity).toBe("0");
  await page.evaluate(() => (window as unknown as { dispose: () => void }).dispose());
  await expect(page.locator("#chat-container")).toHaveCSS("opacity", "1");
});
