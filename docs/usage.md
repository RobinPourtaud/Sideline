# Using Sideline

## Try it

Use Node.js 24 or later.

```sh
npm ci
npm run build
npm run build:firefox
```

**Chrome / Chromium:** visit `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`.

**Firefox:** visit `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv3/manifest.json`. Temporary add-ons disappear when Firefox restarts.

Open or reload a YouTube watch page and select **Sideline** in YouTube’s playback controls. The same button turns the entire overlay off again; its highlighted state indicates Sideline is on. This choice is saved across videos. In every display mode, the adjacent Sideline settings button opens Customize. Sideline keeps YouTube’s chat loaded. For regular comments, scroll normally or choose **Customize → More controls → Auto-load comments**. Choose Off, 100, 300, or 500; the choice is saved and loads automatically on each video while Sideline is on. Preloading asks YouTube’s existing loader for batches without scrolling; it keeps the current sort order and does not expand replies. The result shows the actual loaded count, which can be below or slightly above your target. Both appear in one feed: chat as it arrives, timestamped comments when playback reaches their time. No account is required by Sideline.

Hover over the comments to reveal the title, controls, and loaded-comment coverage. The idle view shows only comments and fits short conversations; your saved panel height caps longer feeds. Hovering restores the full control area. Drag the title to move and the lower-right corner to resize. Both controls accept arrow keys; hold Shift for larger steps. **Customize** opens a panel beside the comments with display tiles, theme swatches, and text/background controls; **Done** or Escape closes it. On narrow players, the options sit below a compact comment preview. A small Sideline icon sits in YouTube’s playback controls and hides with them. The icon toggles Sideline on and off; all display modes have an adjacent Sideline settings icon. If the player controls are unavailable, the icons appear at the top of the video, opposite the chat box.

Turning Sideline off suspends comment collection and clears rendered comments; turning it on rescans the loaded source. The main view shows one combined comment feed. Keyboard focus also reveals controls; customization and dragging keep them visible. Touch devices keep controls available. Floating modes use the icon in YouTube’s playback controls. **More controls** contains box presets, density, direction, speed, and scrolling area. Theme swatches and display tiles support arrow-key navigation; all transitions respect reduced motion.

## Display styles

| Style | Behavior |
| --- | --- |
| Chat box | Full messages in a movable, resizable panel; scroll back to read |
| Scrolling · 弾幕 | Japanese-style comments travel across the video; choose direction, speed, and top/bottom/full area |
| Top comments | Short, stationary lines near the top |
| Bottom comments | Short, stationary lines above the player controls |

Floating comments follow video pause and playback speed and clear on seeking. Quiet uses one row, Balanced uses up to three, and Lively uses all rows that fit in the selected area, with a safety cap of 60 active comments. Scrolling followers enter as soon as there is room. Queued comments are discarded at five seconds of playback age; pausing freezes age, playback speed follows the video clock, and seeking clears the queue. Crowded moments skip excess comments rather than accumulating an out-of-sync backlog. Scrolling text completes its exit beyond the video edge; text is capped at 180 characters. Use Chat box for full text and translation originals. Reduced-motion preferences turn scrolling into stationary lines. Changing style starts a fresh view of the latest loaded comments. Resizing scrolling comments preserves their positions and updates travel speed and spacing for the new player width; stationary styles refresh to fit the new area.

**Comment density** also controls repeats in every display style, including Chat box:

| Mode | Repeat handling |
| --- | --- |
| Quiet | Groups matching chat and remembers it until 60 seconds pass without a new matching message |
| Balanced | Groups matching chat loaded together or arriving within a five-second burst |
| Lively | Keeps every chat message separate, within the usual display limits |

Forty matching greetings become one message with **+39**. The count tracks additional observed messages, not unique viewers. Scrolling comments reserve a small, fixed space for the count, so adding digits does not widen the comment or change its animation. Large scrolling counts use compact notation; the chat box retains full counts. Equivalent spellings keep the first visible wording for that pass. Matching ignores case, punctuation, symbols (including emoji alongside text), extra whitespace, and Unicode presentation variants. Symbol-only reactions keep separate groups so unrelated emoji do not collapse into one empty match; custom emoji and stickers retain their media identity. Paid and membership messages stay separate. Regular timestamped comments show a compact **👍 + likes** badge when YouTube exposes a nonzero count; compact/localized labels such as 1.2K are preserved.

Repeat memory is bounded and stays on your device. Hiding Sideline, seeking, changing density, or leaving the video clears it. Already loaded messages do not extend the memory window just because playback updates. Comment content is never stored on disk or sent to a backend.

## Interface languages

Sideline follows your browser language and supports English, French, Spanish, German, Portuguese, Japanese, Korean, Simplified Chinese, Hindi, and Arabic. Change it in **Customize → More controls → Interface language**. The choice is saved locally and also applies to the popup. Unsupported browser languages fall back to English. Arabic uses right-to-left controls. Interface language does not translate comment content; that remains a separate opt-in feature.

## Translation

In supported desktop Chromium browsers, open **Customize → Translation · on device**, choose **Comment language** and **Translate into**, then select **Translate comments**. Native API availability is checked; Chromium branding alone does not guarantee support. Firefox and Safari currently omit these controls.

Translation is off by default and enabled for the current video session only. Language choices are saved locally. Chrome may download a language pack after your click; progress and failures appear in settings. Text is translated on-device, with the original shown beneath it. No cloud fallback, API key, or extra extension permission is used. Select the source language explicitly; automatic language detection is not included, and mixed-language chat may translate poorly.


## Known limits

- Collection depends on YouTube's DOM and can break when YouTube changes it.
- Only `https://www.youtube.com/*` is matched; the app activates on watch pages. Shorts, embedded players, pop-out chat, and native video-only fullscreen are not supported.
- Chat is limited to the last 120 loaded message elements and mirrors YouTube's selected filtering mode. Paid text, membership messages, and Super Stickers are best-effort.
- Chat-box messages show available avatars, channel links, author badges, custom emoji, and stickers from supported YouTube/Google image URLs already present in the page. Missing or unsupported images fall back to initials or text. Floating comments render custom emoji and stickers at the selected text size, with eager loading and text fallbacks. No profile lookup is performed; displaying images can make requests to Google (see [Privacy](PRIVACY.md)).
- Timestamp coverage counts loaded top-level threads, not all comments or replies. At most 1,000 threads are retained per watch session.
- A timestamp comment appears for eight video seconds. Seeking backward can intentionally show it again. Dense moments show at most 30 comments.
- The panel is hidden during detected ads. Ad detection depends on YouTube's player state.
- Low background opacity can reduce text contrast. The default is 94%.
- WebKit UI tests are not a claim of Safari extension support.
