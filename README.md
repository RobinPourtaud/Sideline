<p align="center"><img src="public/mark.svg" width="72" alt="Sideline"></p>

# Sideline

**YouTube comments, on screen.**

A small, local-only browser extension that puts YouTube's loaded chat and timestamped comments over the video. TypeScript, plain DOM/CSS, no backend or YouTube API.

**Status: development preview.** Chrome and Firefox builds are available locally. This has not been submitted to either extension store. YouTube can unload chat during fullscreen; Sideline retains the last view and reports that the source is unavailable. It does not silently fetch replacement chat.

## What's here

- Movable, resizable panel with pointer and keyboard controls.
- Four themes: Forest, Paper, Midnight, and Sakura; optional system appearance.
- Chat box, Japanese-style scrolling comments (danmaku), and stationary top/bottom comments.
- Independent chat/floating text sizes, background opacity, and chat-box size presets.
- Scrolling direction, speed, area, and density controls; reduced-motion fallback.
- Live-chat and replay messages from YouTube’s existing chat panel. Sideline opens a collapsed chat when its standard control is available, then conceals the native panel while the overlay is active. Hiding Sideline restores the native panel.
- Pause/resume the combined comment display without pausing the video.
- Timestamp links in loaded top-level regular comments. Comments with multiple timestamps split into sections, each appearing at its own time with its author and emoji preserved.
- Eight-second timestamp display windows that follow forward and backward seeking.
- Explicit loaded-comment coverage and chat-source status.
- Optional on-device translation in browsers exposing the native Translator API.
- Local preferences; no comment history persisted.
- Separate Chrome and Firefox Manifest V3 builds.

Automatic comment loading, replies, mobile, and Safari extension packaging are not implemented.

## Try it

Use Node.js 24 or later.

```sh
npm ci
npm run build
npm run build:firefox
```

**Chrome / Chromium:** visit `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`.

**Firefox:** visit `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv3/manifest.json`. Temporary add-ons disappear when Firefox restarts.

Open or reload a YouTube watch page and select **Sideline** in YouTube’s playback controls. The same button turns the entire overlay off again; its highlighted state indicates Sideline is on. This choice is saved across videos. In floating modes, the adjacent settings button opens Customize. Sideline keeps YouTube’s chat loaded. For regular comments, scroll normally or choose **Customize → More controls → Auto-load comments**. Choose Off, 100, 300, or 500; the choice is saved and loads automatically on each video while Sideline is on. Preloading asks YouTube’s existing loader for batches without scrolling; it keeps the current sort order and does not expand replies. The result shows the actual loaded count, which can be below or slightly above your target. Both appear in one feed: chat as it arrives, timestamped comments when playback reaches their time. No account is required by Sideline.

Hover over the comments to reveal the title, controls, and loaded-comment coverage. The idle view shows only comments and fits short conversations; your saved panel height caps longer feeds. Hovering restores the full control area. Drag the title to move and the lower-right corner to resize. Both controls accept arrow keys; hold Shift for larger steps. **Customize** opens a panel beside the comments with display tiles, theme swatches, and text/background controls; **Done** or Escape closes it. On narrow players, the options sit below a compact comment preview. A small Sideline icon sits in YouTube’s playback controls and hides with them. The icon toggles Sideline on and off; floating modes have an adjacent customization icon whose tooltip includes loaded-source coverage. If the player controls are unavailable, the icons appear at the top of the video, opposite the chat box.

The main view shows one combined comment feed. Keyboard focus also reveals controls; customization and dragging keep them visible. Touch devices keep controls available. Floating modes use the icon in YouTube’s playback controls. **More controls** contains box presets, density, direction, speed, and scrolling area. Theme swatches and display tiles support arrow-key navigation; all transitions respect reduced motion.

## Display styles

| Style | Behavior |
| --- | --- |
| Chat box | Full messages in a movable, resizable panel; scroll back to read |
| Scrolling · 弾幕 | Japanese-style comments travel across the video; choose direction, speed, and top/bottom/full area |
| Top comments | Short, stationary lines near the top |
| Bottom comments | Short, stationary lines above the player controls |

Floating comments follow video pause and playback speed and clear on seeking. Density is limited to six lanes (fewer in a small player), with scrolling followers entering as soon as there is room in a lane. A bounded queue smooths incoming bursts; exceptionally busy moments still skip excess comments. Scrolling text completes its exit beyond the video edge; text is capped at 180 characters. Use Chat box for full text and translation originals. Reduced-motion preferences turn scrolling into stationary lines. Changing style or player size starts a fresh view of the latest loaded comments.

## Interface languages

Sideline follows your browser language and supports English, French, Spanish, German, Portuguese, Japanese, Korean, Simplified Chinese, Hindi, and Arabic. Change it in **Customize → More controls → Interface language**. The choice is saved locally and also applies to the popup. Unsupported browser languages fall back to English. Arabic uses right-to-left controls. Interface language does not translate comment content; that remains a separate opt-in feature.

## Translation

In supported desktop Chromium browsers, open **Customize → Translation · on device**, choose **Comment language** and **Translate into**, then select **Translate comments**. Native API availability is checked; Chromium branding alone does not guarantee support. Firefox and Safari currently omit these controls.

Translation is off by default and enabled for the current video session only. Language choices are saved locally. Chrome may download a language pack after your click; progress and failures appear in settings. Text is translated on-device, with the original shown beneath it. No cloud fallback, API key, or extra extension permission is used. Select the source language explicitly; automatic language detection is not included, and mixed-language chat may translate poorly.

## Develop

```sh
npm run dev
npm run dev:firefox
npm run check
npm run build
npm run build:firefox
npx playwright install chromium firefox webkit
npm run test:browser
npx web-ext lint --source-dir .output/firefox-mv3 --warnings-as-errors
```

Browser tests require a Chrome production build. Tests use synthetic comments and local fixtures; they do not contact YouTube. The Firefox installed-extension smoke test additionally needs `geckodriver` and `openssl`:

```sh
npm run test:firefox-extension
```

Set `GECKODRIVER` and `FIREFOX_BINARY` to explicit executables when needed. It uses a temporary profile and a local HTTPS fixture at a YouTube hostname, without changing system DNS or the production manifest.

`npm run preview:ui` opens a local fixture server at `http://localhost:5199/tests/fixtures/watch.html`. Fixture data is never packaged in the extension.

## Design and boundaries

| Directory | Responsibility |
| --- | --- |
| `src/core` | Data contracts, preference validation, geometry, timestamp selection |
| `src/youtube` | Read-only DOM adapters and observer lifecycles |
| `src/playback` | Video clock and ad/seek state |
| `src/ui` | Shadow DOM panel, styles, keyboard and pointer interactions |
| `src/translation` | Optional native translation, bounded queue, in-memory cache and cancellation |
| `src/browser` | Session coordination and extension-local storage |
| `entrypoints` | WXT content script and help popup |

See [architecture](docs/architecture.md), [testing](docs/testing.md), [privacy](PRIVACY.md), and [collection decisions](docs/collection.md).

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Small, focused changes and explicit browser evidence are welcome. No remote runtime code, tracking, broad host access, or private YouTube endpoints.

## License

[MIT](LICENSE).
