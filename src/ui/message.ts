import { formatTime } from "../core/timestamps";
import type { Message } from "../core/types";
import { I18n } from "../i18n";
import { element } from "./dom";

function image(source: string, label: string, className: string, eager = false) {
  const img = element("img", className);
  img.alt = label;
  img.referrerPolicy = "no-referrer";
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  img.addEventListener(
    "error",
    () => {
      if (className === "avatar-image") img.remove();
      else img.replaceWith(document.createTextNode(label));
    },
    { once: true },
  );
  img.src = source;
  return img;
}

export function messageContent(message: Message, className: string, limit = Infinity) {
  const body = element("span", className);
  body.dir = "auto";
  const eager = Number.isFinite(limit);
  let remaining = limit;
  const parts = message.parts ?? (message.sticker ? [] : [{ text: message.text }]);
  for (const part of parts) {
    if (remaining <= 0) break;
    if (part.image) {
      body.append(image(part.image, part.text, "emoji", eager));
      remaining--;
    } else {
      const clipped = part.text.length > remaining;
      body.append(
        document.createTextNode(clipped ? `${part.text.slice(0, remaining - 1)}…` : part.text),
      );
      remaining -= part.text.length;
    }
  }
  if (message.sticker)
    body.append(image(message.sticker.image, message.sticker.label, "sticker", eager));
  return body;
}

export function messageRow(
  message: Message,
  translated?: string,
  language?: string,
  i18n = new I18n("en"),
) {
  const row = element("li", "message");
  row.dataset.messageId = message.id;
  const avatar = element(
    "span",
    "avatar",
    Array.from(message.author.trim().replace(/^@/, ""))[0]?.toUpperCase() || "?",
  );
  avatar.setAttribute("aria-hidden", "true");
  if (message.avatar) avatar.append(image(message.avatar, "", "avatar-image"));
  const main = element("div", "message-content");
  const identity = element("div", "identity");
  const author = element("bdi", "author", message.author);
  if (message.profileUrl) {
    const link = element("a", "profile-link");
    link.href = message.profileUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = i18n.t("Open {author}’s YouTube channel (new tab)", { author: message.author });
    link.append(author);
    identity.append(link);
  } else identity.append(author);
  for (const badge of message.badges ?? []) {
    const label = element("span", "author-badge");
    label.title = badge.label;
    label.append(
      badge.image
        ? image(badge.image, badge.label, "badge-image")
        : document.createTextNode(badge.label),
    );
    identity.append(label);
  }
  if (message.time !== undefined)
    identity.append(element("span", "timestamp", formatTime(message.time)));
  main.append(identity);
  if (translated && translated !== message.text) {
    const body = element("span", "body", translated);
    body.dir = "auto";
    if (language) body.lang = language;
    const original = messageContent(message, "original");
    original.prepend(document.createTextNode(i18n.t("Original: ")));
    main.append(body, original);
  } else main.append(messageContent(message, "body"));
  row.append(avatar, main);
  return row;
}
