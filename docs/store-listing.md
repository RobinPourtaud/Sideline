# Sideline v0.2.1 — store listing

## Title

Sideline — Danmaku & Comments for YouTube

## Summary

YouTube comments, on screen.

## Description

Follow the conversation. Stay with the video.

Sideline brings YouTube live chat, replay chat, and loaded timestamped comments into your video. Choose smooth scrolling danmaku, a movable chat box, or quiet comments at the top or bottom.

MAKE ROOM FOR THE GOOD PARTS
• Quiet groups matching chat and remembers it for 60 seconds.
• Balanced groups short five-second bursts.
• Lively shows each message separately, within display limits.
• Forty matching greetings become one “Hello +39”. Matching ignores case and symbols, and counts update without restarting scrolling motion.

REACTIONS AT THE RIGHT MOMENT
Timestamped regular comments appear when playback reaches their reference, with available like counts. Comments with multiple timestamps split into separate moments. Scrolling follows video pause and playback speed, with spacing that adapts to your player size.

YOUR VIEW, YOUR CHOICE
Move and resize the chat box. Choose Forest, Paper, Midnight, or Sakura. Adjust text size, opacity, scrolling speed, direction, area, and density. Ten interface languages are included, with optional on-device comment translation in supported browsers.

LOCAL BY DESIGN
No Sideline account, backend, analytics, or comment uploads. Preferences stay in local extension storage; comments, repeat memory, and translations stay in memory for the video session. Sideline never posts, likes, subscribes, or changes your YouTube account data. Avatars and emoji can load from YouTube/Google image servers. Translation may download browser-provided language packs.

GET STARTED
Open or reload a YouTube watch page and click the Sideline icon in the playback controls. Use the adjacent settings button to customize your view. Optional automatic comment loading asks YouTube’s existing loader for more batches without scrolling; it defaults to Off.

OPEN SOURCE, OPEN TO CONTRIBUTIONS
About half of Sideline was vibe-coded with AI assistance. The code is open for inspection and improvement, and all contributions are welcome: bug reports, translations, cleanup, design, and browser testing.
https://github.com/RobinPourtaud/sideline

Sideline shows comments YouTube has loaded; it does not scan every comment or include replies. Chat availability depends on YouTube’s page and can change during navigation or fullscreen transitions. Desktop YouTube watch pages are supported; Shorts, embeds, and mobile layouts are outside the current scope. On-device translation requires browser support and is not available in Firefox.

Screenshots show the actual Sideline interface with synthetic comments over an original demonstration scene. Sideline is independent and is not affiliated with YouTube, Google, or Mozilla.

## URLs

- Homepage: https://github.com/RobinPourtaud/sideline
- Support: https://github.com/RobinPourtaud/sideline/issues
- Privacy: https://github.com/RobinPourtaud/sideline/blob/main/PRIVACY.md
- Source: https://github.com/RobinPourtaud/sideline

## Localization

Use `store-titles.json` and `store-descriptions.json` for natural localized copy. The extension manifest supplies localized names from `public/_locales`. The five numbered screenshots in each `assets/v0.2.0/localized/<locale>` folder include actual translated UI and localized synthetic comments; English stays in the asset root. A separate `pt_PT` set adapts European Portuguese marketing copy while showing the shared Portuguese UI. Chrome and Edge support language-specific screenshot sets. Firefox uses shared screenshot images and localized captions.

## Images

Use the five numbered PNGs in `assets/v0.2.0` as screenshots, in order. Each is 1280 × 800 and depicts actual Sideline UI. The Chrome small promo is `promo-small.png` (440 × 280); the marquee is `promo-marquee.png` (1400 × 560). The icon is `public/icons/128.png`, with 16px transparent padding around the existing mark. Promotional compositions are conceptual artwork, separate from the screenshots.

## Reviewer notes

No Sideline account or credentials are required. Open a desktop YouTube watch page with live/replay chat, or a regular video with loaded timestamped comments. Enable Sideline through its player icon. Test Quiet, Balanced, and Lively in Customize → More controls, pause/resume, fullscreen, and navigation. Like counts require a timestamped regular comment with a nonzero loaded count. Firefox omits the unsupported on-device translation controls.

Source archive build steps: Node.js 24+, `npm ci`, `npm run build:firefox`. BUILDING.md in the source archive contains full reproduction instructions. The source archive contains no credentials and requires no image-generation API.

## Review state

The repository and GitHub release can be published independently. Store assets and packages are prepared for Robin’s review before store submission unless Robin explicitly requests submission. Store approval and public availability are separate from saving a draft.

## Support contact

Use **sideline@pourtaud.dev** for extension support and store review correspondence. Keep publisher-account and Git attribution emails unchanged.
