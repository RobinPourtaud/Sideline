# Safari App Store listing

- App name: Sideline: Danmaku for YouTube
- Subtitle: YouTube comments, on screen
- Platform: macOS
- Version: 0.2.1 (build 2)
- Bundle ID: dev.pourtaud.sideline
- SKU: sideline-macos
- Primary language: English (US)
- Price: US $1.99, one-time purchase (localized by Apple)
- Primary category: Utilities
- Support URL: https://pourtaud.dev/projects/sideline/
- Marketing URL: https://pourtaud.dev/projects/sideline/
- Privacy URL: https://pourtaud.dev/sideline/privacy/
- Support/review email: sideline@pourtaud.dev
- Copyright: 2026 Robin Pourtaud
- Keywords: youtube,comments,danmaku,live chat,replay,timestamps,video,safari,overlay

## Promotional text

Follow the conversation. Stay with the video. Bring YouTube live chat and timed reactions into the picture, with smooth scrolling and less repetition.

## Description

Sideline brings YouTube comments into your video in Safari for Mac.

Follow live chat, replay chat, and loaded timestamped comments as scrolling danmaku, a movable chat box, or lines along the top or bottom. Choose the view that fits the way you watch.

LESS REPETITION, MORE ROOM
Quiet remembers matching chat for 60 seconds. Balanced groups five-second bursts. Lively keeps messages separate within display limits. Forty matching greetings become one “Hello +39”. Matching ignores case and symbols; repeat counters update without restarting motion.

REACTIONS AT THE RIGHT MOMENT
Loaded timestamped comments appear at their reference time, with available like counts. Scrolling follows video pause and playback speed, with spacing that adapts to the player width.

MAKE IT YOURS
Choose Forest, Paper, Midnight, or Sakura. Adjust text size, opacity, position, scrolling direction, speed, and density. Move and resize the chat box. Ten interface languages are included.

LOCAL BY DESIGN
No Sideline account, analytics, or comment uploads. Preferences stay in local extension storage. Comments and repeat memory stay in memory for the watch session. Sideline never posts, likes, subscribes, or changes your YouTube account. Avatars and emoji reuse YouTube/Google image URLs.

GET STARTED
Open Sideline, then open Safari Settings. Enable the extension and allow access to www.youtube.com. Open or reload a desktop YouTube watch page and select Sideline in the player controls. Use Customize for display and appearance settings.

OPEN SOURCE, OPEN TO CONTRIBUTIONS
About half of Sideline was vibe-coded with AI assistance. All contributions are welcome: bug reports, translations, code cleanup, design, and browser testing.
https://github.com/RobinPourtaud/Sideline

Sideline displays comments that YouTube has loaded; it does not fetch every comment or include replies. Optional auto-loading invokes YouTube’s existing loader and defaults to Off. Live chat depends on YouTube’s page and may stop supplying messages during fullscreen transitions. Desktop YouTube watch pages are supported; Shorts, embeds, mobile layouts, and the YouTube app are outside the scope. On-device translation is not available in Safari.

Screenshots show Sideline’s actual shared interface with synthetic comments over an original demonstration scene. Sideline is independent and is not affiliated with YouTube, Google, or Apple.

Questions or feedback: sideline@pourtaud.dev

## Review notes

This Mac app installs a Safari web extension. The containing app shows local setup instructions, extension state, and a button to open Safari Settings. Enable Sideline and allow www.youtube.com, then open/reload a desktop YouTube watch page. The overlay is activated with the Sideline icon in the player controls; Customize contains display styles, themes, and density controls.

No Sideline login is required. YouTube may require an account to play particular videos; choose an accessible public video or live stream. Loaded timestamped comments are enough to test the overlay without live chat. YouTube must first load its initial regular-comment batch for manual coverage; optional Auto-load comments invokes the existing continuation loader.

Only storage, scripting, and the www.youtube.com host are requested. A Safari background registers a fixed packaged MAIN-world bridge for the existing comment loader. There is no backend, analytics, posting, native messaging, or remote runtime code. Preferences remain local; repeat matching is bounded in memory.

Source and build documentation: https://github.com/RobinPourtaud/Sideline/tree/feat/safari
Requires Safari 16.4 or later. Installed checks use Safari 27 on a physical Mac.
Support and review contact: sideline@pourtaud.dev

## Screenshot provenance

The five 1280 × 800 actual-interface compositions are reused from the refreshed asset set in docs/assets/safari/. The shared UI is unchanged on Safari; synthetic comments and the original demonstration scene are labelled in each composition. No customer messages, signed-in account details, or third-party video artwork are included.
