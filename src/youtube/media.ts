import type { Message, MessagePart } from "../core/types";

export function imageUrl(value: string | null): string | undefined {
  if (!value || value.length > 2048) return;
  try {
    const url = new URL(value, "https://www.youtube.com");
    const allowed =
      url.hostname === "yt3.ggpht.com" ||
      url.hostname === "yt4.ggpht.com" ||
      url.hostname === "yt3.googleusercontent.com" ||
      url.hostname === "lh3.googleusercontent.com" ||
      (url.hostname === "www.youtube.com" && url.pathname.startsWith("/s/")) ||
      (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/youtube/"));
    if (allowed && url.protocol === "https:" && !url.username && !url.password && !url.port)
      return url.href;
  } catch {
    return;
  }
}

export function channelUrl(value: string | null): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value, "https://www.youtube.com");
    if (
      url.origin === "https://www.youtube.com" &&
      !url.username &&
      !url.password &&
      /^\/(?:@[\p{L}\p{N}_.%\-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)\/?$/u.test(url.pathname)
    )
      return `${url.origin}${url.pathname}`;
  } catch {
    return;
  }
}

export function readIdentity(root: Element): Pick<Message, "avatar" | "profileUrl" | "badges"> {
  const avatar = root.querySelector("#author-photo img, #author-thumbnail img");
  const link = root.querySelector("a#author-text, a#author-name, a#author-photo, #author-photo a");
  const badges = Array.from(root.querySelectorAll("yt-live-chat-author-badge-renderer"))
    .slice(0, 3)
    .map((badge) => {
      const img = badge.querySelector("img");
      return {
        label: (
          badge.getAttribute("aria-label") ||
          badge.getAttribute("tooltip") ||
          badge.querySelector("[aria-label]")?.getAttribute("aria-label") ||
          img?.getAttribute("alt") ||
          badge.textContent ||
          ""
        )
          .trim()
          .slice(0, 80),
        image: imageUrl(img?.getAttribute("src") ?? null),
      };
    })
    .filter((badge) => badge.label);
  return {
    avatar: imageUrl(avatar?.getAttribute("src") ?? null),
    profileUrl: channelUrl(link?.getAttribute("href") ?? null),
    badges: badges.length ? badges : undefined,
  };
}

export function readParts(
  root: Node,
  maxLength = 2000,
  onLink?: (link: Element, offset: number) => void,
): MessagePart[] {
  const parts: MessagePart[] = [];
  let remaining = maxLength;
  let images = 0;
  function append(text: string, image?: string) {
    if (remaining <= 0) return;
    const value = text.slice(0, remaining);
    remaining -= value.length;
    const previous = parts.at(-1);
    if (!image && previous && !previous.image) previous.text += value;
    else if (value || image) parts.push({ text: value, ...(image ? { image } : {}) });
  }
  function visit(node: Node) {
    if (remaining <= 0) return;
    if (node.nodeType === 3) append(node.textContent ?? "");
    else if (node.nodeType === 1) {
      const element = node as Element;
      if (element.tagName === "A") onLink?.(element, maxLength - remaining);
      if (element.tagName === "IMG") {
        const image = images < 24 ? imageUrl(element.getAttribute("src")) : undefined;
        if (image) images++;
        append(element.getAttribute("alt") || (image ? "Emoji" : ""), image);
      } else if (element.tagName === "BR") append("\n");
      else if (!["SCRIPT", "STYLE"].includes(element.tagName))
        for (const child of node.childNodes) visit(child);
    }
  }
  visit(root);
  return parts;
}
