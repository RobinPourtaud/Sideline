# Sideline

YouTube comments, on screen.

A lightweight browser extension for viewing live chat and timestamped comments over YouTube videos. This repository is at the planning stage; no extension is implemented yet.

## Planned features

- Movable, resizable live-chat overlay.
- Adjustable font size, light/dark appearance, and background opacity.
- Optional scrolling comments (danmaku), with direction, speed, and density controls.
- Timestamped regular comments displayed at their referenced playback times on any supported YouTube video, with seeking and duplicate handling.
- Preferences stored locally in the browser.

Live streams are the first milestone. Timestamped comments follow, with clear coverage of which comments have been loaded. Translation is a possible later feature, not part of the initial scope.

## Technical direction

- One shared WebExtension codebase, targeting Chrome and Firefox desktop first.
- TypeScript and plain DOM/CSS; no frontend framework or backend.
- Access restricted to youtube.com. Read existing comments and add the extension overlay; never post, like, or change account data.
- No comment data sent to external services.
- Keep collection, playback synchronization, rendering, and browser integration separate.
- Consider Safari after the initial desktop release; packaging and compatibility need separate validation.

Browser host permissions are not literally read-only; the restriction above describes the extension's intended behavior. Source access, YouTube policies, and store requirements must be verified during implementation.

## First milestone

Prototype reading live chat on a YouTube watch page and rendering it in a movable overlay, then validate fullscreen behavior in Chrome and Firefox. Confirm permissions and performance before expanding the feature set.
