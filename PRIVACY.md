# Privacy

Sideline runs locally on YouTube watch pages.

It reads messages from YouTube's existing chat panel and timestamp links in regular comments that YouTube has already loaded. It renders comments and their available author identities over the video. Sideline does not send comment content, author names, video history, or preferences to a server.

Preferences (appearance, panel position/size, visibility, display style, motion settings, interface language, translation language choices, and automatic comment-loading target) are saved in your browser's local extension storage and update other open YouTube tabs. Comment data stays in memory for the current watch session and is discarded when that session ends. Uninstalling the extension removes its local preferences.

Interface translations ship with the extension and need no network connection. Browser language is used locally to choose the default interface.

Optional comment translation uses the browser’s on-device Translator API after an explicit click. The browser may download language packs from its provider; comment text is not uploaded for translation. Translations remain in a bounded memory cache for the watch session, and there is no cloud fallback.

Sideline has no analytics, telemetry, accounts, advertising, remote fonts, or remote runtime code. It does not post comments, like videos, subscribe, or change YouTube account data. If you enable Auto-load comments (100, 300, or 500), Sideline automatically invokes YouTube’s existing comment continuation handler to load additional batches on each video while the overlay is enabled. The setting defaults to Off. YouTube makes its normal requests; Sideline does not call a comment API or send data to another service. Activating Sideline may open YouTube’s existing chat panel through its normal show-chat control; the native panel is then visually concealed while supplying the overlay. Turning Sideline off restores it, disconnects comment collection, and clears rendered comments. Turning Sideline back on reads the currently loaded sources again.

Avatars, emoji, membership badges, and stickers reuse image URLs exposed in the loaded YouTube page, restricted to supported YouTube/Google image hosts. Displaying these images may request those assets from Google (including the browser’s usual network information, such as your IP address); Sideline sends no comment text or referrer with these requests. No profile lookup is performed. Channel links open YouTube only when clicked.

YouTube itself continues to operate normally and may make its own network requests. Sideline's local processing does not change YouTube's privacy practices.

Permissions:
- **storage**: save preferences on this browser.
- **www.youtube.com page access**: read the existing page and insert the overlay.

Browser page access technically permits page modification; Sideline's read-only collection behavior is an implementation promise, not a special read-only browser permission.
