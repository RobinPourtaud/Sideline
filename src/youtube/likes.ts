export function readLikes(comment: Element): string | undefined {
  for (const count of comment.querySelectorAll("#vote-count-middle, #vote-count-left")) {
    if (count.closest("#replies, ytd-comment-replies-renderer")) continue;
    const label = count.textContent?.trim().replace(/\s+/gu, " ");
    if (label && label.length <= 40 && /\p{N}/u.test(label) && !/^[0٠۰०]+$/u.test(label))
      return label;
  }
}
