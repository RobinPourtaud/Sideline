import { expect, test } from "@playwright/test";

test("new chat and repeat counts preserve existing rows, images and focus", async ({ page }) => {
  await page.route("https://yt3.ggpht.com/**", (route) =>
    route.fulfill({ contentType: "image/png", path: "public/icons/32.png" }),
  );
  await page.goto("/tests/fixtures/watch.html");
  await page
    .frameLocator("#chatframe")
    .locator("#first")
    .evaluate((item) => {
      item.insertAdjacentHTML(
        "afterbegin",
        '<a id="author-photo" href="https://www.youtube.com/@mika"><img src="https://yt3.ggpht.com/avatar"></a>',
      );
    });
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  const rows = page.locator("sideline-overlay .message");
  await expect(rows).toHaveCount(3);
  await expect(rows.first().locator(".avatar-image")).toBeVisible();
  const retained = await rows.evaluateAll((nodes) => {
    for (const node of nodes) {
      node.setAttribute("data-retained", "yes");
      for (const image of node.querySelectorAll("img")) image.dataset.retained = "yes";
    }
    return nodes.map((node) => node.getAttribute("data-message-id"));
  });
  await rows.first().getByRole("link").focus();
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      root.insertAdjacentHTML(
        "beforeend",
        '<yt-live-chat-text-message-renderer id="arrival"><span id="author-name">New viewer</span><span id="message">A new message</span></yt-live-chat-text-message-renderer>',
      );
    });
  await expect(rows).toHaveCount(4);
  for (const id of retained) {
    await expect(page.locator(`.message[data-message-id="${id}"]`)).toHaveAttribute(
      "data-retained",
      "yes",
    );
  }
  await expect(rows.first().locator(".avatar-image")).toHaveAttribute("data-retained", "yes");
  await expect(rows.first().getByRole("link")).toBeFocused();
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const repeat = root.querySelector("#first")!.cloneNode(true) as HTMLElement;
      repeat.id = "repeat";
      root.append(repeat);
    });
  await expect(rows.first().locator(".repeats")).toHaveText("+1");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toHaveAttribute("data-retained", "yes");
  await expect(rows.first().locator(".avatar-image")).toHaveAttribute("data-retained", "yes");
  await expect(rows.first().getByRole("link")).toBeFocused();
  await page
    .frameLocator("#chatframe")
    .locator("#arrival #message")
    .evaluate((node) => {
      node.textContent = "Edited message";
    });
  await expect(rows.last()).toContainText("Edited message");
  await page
    .frameLocator("#chatframe")
    .locator("#arrival")
    .evaluate((node) => node.remove());
  await expect(rows).toHaveCount(3);
  await expect(rows.first().locator(".avatar-image")).toHaveAttribute("data-retained", "yes");
});

test("chat and timed comments share arrival order, expiry and seeking", async ({ page }) => {
  await page.goto("/tests/fixtures/watch.html");
  await page.getByRole("button", { name: "Open Sideline", exact: true }).click();
  await page.locator("sideline-overlay .panel").hover();
  await expect(page.getByRole("radiogroup", { name: "Comments from" })).toHaveCount(0);
  await page.locator("ytd-comments").evaluate((root) => {
    root.innerHTML =
      '<ytd-comment-thread-renderer><span id="author-text">Moment</span><span id="content-text"><a href="https://www.youtube.com/watch?v=fixture&t=0s">0:00</a> Perfect opening</span></ytd-comment-thread-renderer>';
  });
  const rows = page.locator("sideline-overlay .message");
  await expect(rows).toHaveCount(4);
  await expect(rows.last()).toContainText("Perfect opening");
  await page
    .frameLocator("#chatframe")
    .locator("#items")
    .evaluate((root) => {
      const message = document.createElement("yt-live-chat-text-message-renderer");
      message.id = "new-chat";
      message.innerHTML =
        '<span id="author-name">Chat viewer</span><span id="message">Agreed!</span>';
      root.append(message);
    });
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(3)).toContainText("Perfect opening");
  await expect(rows.last()).toContainText("Agreed!");
  await page.locator("sideline-overlay .panel").hover();
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 9 });
    video.dispatchEvent(new Event("timeupdate"));
  });
  await expect(rows).toHaveCount(4);
  await expect(rows.filter({ hasText: "Perfect opening" })).toHaveCount(0);
  await page.locator("sideline-overlay .panel").hover();
  await page.locator("video").evaluate((video) => {
    Object.defineProperty(video, "seeking", { configurable: true, get: () => true });
    video.dispatchEvent(new Event("seeking"));
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 0 });
    Object.defineProperty(video, "seeking", { configurable: true, get: () => false });
    video.dispatchEvent(new Event("seeked"));
  });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Perfect opening");
});
