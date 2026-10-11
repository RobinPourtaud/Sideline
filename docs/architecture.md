# Architecture

Sideline has one package and two production content scripts. WXT handles packaging; only the browser boundary imports its APIs. There is no background worker, request interception, framework, or remote service.

## Lifecycle

The content script is installed on YouTube pages so navigation from the home page into a video works. The coordinator activates only for a watch URL with a player and video. It responds to YouTube navigation and fullscreen events and uses a 750 ms reconciliation interval for player/frame replacement and missed navigation events. A watch-page video ID, when present, must match the URL before attachment.

A session owns a panel, chat collector, comment collector, and playback subscription. Navigation or player replacement disposes all observers, timers, event listeners, and the panel. Extension invalidation also disposes the coordinator. Pending preference writes are serialized to avoid reordering.

## Collection

The chat adapter reads the existing same-origin chat iframe through DOM APIs. It does not read YouTube's JavaScript state, continuation tokens, cookies, or authentication details. The iframe's document can change without its src attribute changing. Document identity is reconciled; the old observer is disconnected.

DOM changes are coalesced for 100 ms. Messages are identified by YouTube's element IDs, never by text alone. The visible snapshot is bounded to 120 messages. Deleted message markers are excluded. Nodes from another frame must be inspected by node type/tag name, not parent-window instanceof checks.

The regular-comment adapter watches YouTube's comment container, coalescing changes for 250 ms. It reads top-level comment text and timestamp links pointing to the current video. Permalinks identify threads when available; a deterministic content hash is the fallback. Comments with multiple valid timestamp links are split in document order: each link owns the text and media until the next link, with introductory text kept in the first section. A single timestamp keeps the whole comment. Repeated references to the same time are grouped into one entry; unrelated video links do not split sections. Parsing shares the existing bounded text/media traversal, and section identities remain thread ID plus playback time. At most 1,000 loaded threads are retained for the session. It never scrolls or expands replies. The optional preloader separately requests batches up to a saved target of 100, 300, or 500 top-level comments while Sideline is visible (default Off), stopping after six seconds without progress or 30 seconds total. Switching Off, hiding Sideline, and navigation cancel further requests; an already requested YouTube batch may still finish.

A small MAIN-world script listens for a DOM event with no payload and invokes only the active comments container’s existing `triggerContinuation` method. It checks the expected continuation type, excludes reply continuations, and requests each endpoint object once. The page bridge has no extension APIs or stored preferences. The overlay and collectors remain isolated. This undocumented YouTube method may change; missing handlers produce a bounded partial-result status, with no scrolling or direct API fallback. MAIN-world manifest scripts are supported by our Chrome/Firefox minimum versions ([Mozilla compatibility](https://blog.mozilla.org/addons/2024/07/10/manifest-v3-updates-landed-in-firefox-128/)).

## Playback

Live/replay chat follows YouTube's own loaded chat view. Regular comments have a separate video-relative index. Their display is a pure function of playback time and duration: matching comments remain visible for eight seconds. Forward seeks do not dump skipped comments; backward seeks can show comments again. Ads and seeking suppress timestamp presentation. No wall-clock timeout substitutes for the video clock.

## UI

The panel mounts inside the player with a Shadow DOM boundary. CSS custom properties define theme, opacity, and typography. External text is rendered with text nodes; no source HTML is copied into the panel. The YouTube media adapter produces bounded text/image parts and author metadata. Image URLs pass a small HTTPS host/path allowlist; channel links must point to a YouTube channel path. The message renderer creates its own image elements with fixed dimensions, lazy loading, no referrer, and text/initial fallbacks. Each message carries at most 24 inline images and three badges. Floating comments render custom emoji and stickers at the selected text size, with eager loading and text fallbacks.

Position is normalized within available player space, while size is stored in pixels and clamped on every ResizeObserver callback. Moving between fullscreen and normal layouts cannot strand the panel outside the player. Pointer capture handles dragging; arrow keys provide equivalent movement and resize controls. Keyboard and pointer events inside the overlay do not bubble into YouTube's player shortcuts.

The chat log is not a live announcement region: high-frequency chat should not monopolize a screen reader. Display pause is explicit. Settings have labels and visible focus indicators. The default contrast is checked automatically, but arbitrary transparency over video cannot guarantee contrast.

## Fullscreen

The actual fullscreen element is inspected. The overlay remains inside the relevant container, with the normal player as the default. YouTube may unload its native chat iframe on fullscreen transitions. Sideline retains its last bounded snapshot, marks the source unavailable, and resumes when the native panel returns. It does not reparent YouTube’s iframe, patch network requests, or create additional chat frames. ChatPresentation can activate the existing show-chat button once per control while Sideline is enabled. As soon as the container exists, it conceals the native container using transparent, fixed-position CSS and makes it inert. The iframe remains sized and attached; display:none and visibility:hidden are avoided. Previous accessibility attributes and native layout are restored on hide, replacement, or session disposal. This cannot prevent YouTube itself from unloading chat during fullscreen.

This is a known functional limitation of the passive source strategy, not a completed solution for uninterrupted fullscreen chat.

## Preferences and permissions

Only preferences are stored in browser.storage.local, under a versioned schema. Numeric values are validated and clamped; unknown fields are ignored. Failed writes produce an inline notice rather than breaking the panel. No comment text, author names, or video history is persisted.

Only the storage API permission and a www.youtube.com content-script match are used. No cookies, tabs, scripting, activeTab, webRequest, or broad host permission is requested. Browser host access is not intrinsically read-only; read-only collection is an implementation constraint.

## Translation

The panel feature-detects the native Translator API in its isolated content-script context. Unsupported browsers omit translation controls. The translation module has no browser-extension imports or network calls and adds no package dependency. It calls create directly from a user gesture; language-pack progress and creation errors are surfaced in settings. Source and target languages are validated preferences; enabled state is session-only.

Each session owns one translator, an abort controller, a queue of at most 120 unique texts from the current display snapshot, and a 256-entry memory cache. Translation is sequential. New snapshots replace queued work; late results after disable, language changes, or disposal are discarded. Failed messages retain their original text and are cached to avoid retry loops. Hiding or pausing the panel clears pending work; an already running translation may finish. Translated text and originals use text nodes, and the translated span declares its target language.

Source-language detection and cloud fallbacks are deliberately absent. A selected source language is more predictable for short messages; mixed-language chat remains a limitation.

## Display styles and motion

DisplaySettings owns appearance and style-specific controls. Panel owns the chat view; Launcher mounts its isolated icon button in YouTube’s playback controls or falls back to the overlay; FloatingComments owns only the on-video text layer. Source collection is shared across all styles. Theme changes do not recreate the comment source. The four visual themes retain the existing dark/light preference keys for migration; legacy system appearance still works.

FloatingComments uses the Web Animations API, not a requestAnimationFrame loop. Stationary styles allow one message per lane. Scrolling comments use a shared pixels-per-second speed, admitting followers once the previous tail clears the entry edge by 32 pixels. A 100 ms timer runs only while playing with queued comments, staggering launches by at least 180 ms at normal playback speed. Pending messages and active nodes are each capped at 60; overflow drops older pending arrivals. Initial activation shows only a small recent preview. Quiet uses one row, Balanced up to three, and Lively all rows that fit, within the 60-comment active cap. Seen identities are bounded to 1,000 and include timestamp references. Active scrolling comments finish their full exit even when their source leaves the bounded chat snapshot; explicit seeking, hiding, and disposal still clear them. A shared content ResizeObserver supplies measured widths after image fallback or real text edits. Count updates only mutate the badge; a reserved scrolling count slot prevents width changes and animation retiming. Equivalent grouped spellings keep the visible body for the current pass. Animation finish cancels animations and removes nodes. Style changes and seeking reset the view; repeats after an explicit reset are intentional. Scrolling resize preserves each active node, animation clock, and pixel position. All active lanes adopt the same new velocity, preserving their spacing; new arrivals enter only once the previous tail clears the current viewport edge. Rows that no longer fit are removed. Stationary styles refresh on resize.

The playback adapter supplies pause and rate changes. Reduced-motion preference changes replace scrolling with stationary text. Floating text never intercepts pointer events and is hidden from the accessibility tree; the chat-box mode provides the complete readable text view. Text sizes for chat and floating comments are stored separately. Originals and full message text remain available in chat-box mode.

Web Animations compatibility: https://developer.mozilla.org/en-US/docs/Web/API/Element/animate

## Visual controls

The main view exposes one combined comment feed. Customize groups display tiles, theme swatches, and two styled sliders; More controls and translation are collapsed disclosures. Choices is a shared radio-group component with roving tab focus, arrow/Home/End navigation, and explicit checked states. No native select menus remain. Language pickers use the same choices inside styled disclosures.

Customization is a separate themed surface, positioned on the available side of the live comment preview. If necessary, the preview shifts temporarily to keep both surfaces inside the player. Narrow players stack a compact preview above the options; floating modes show the editor directly over the video. These temporary positions and dimensions are not persisted. Its footer and coverage status are hidden while customizing. Press feedback and short entrance transitions are CSS-only and disabled by reduced-motion preferences. Theme foreground/background colors change together to preserve contrast during switching.


## Combined feed

CommentFeed merges bounded chat and active timestamp snapshots in first-appearance order. Existing entries retain their position when content changes; expired or deleted entries disappear. Source-specific keys avoid ID collisions. It retains at most 150 current candidates and presents the latest 120, without re-appending hidden older entries on each playback tick. Seeking resets the feed so stale messages cannot survive a jump. The old source preference is ignored during normalization. Coverage always reports loaded thread/timestamp counts alongside chat availability.

Before merging, ChatGroups groups chat using the existing density preference. Balanced uses fixed five-second arrival windows; Quiet uses a sliding 60-second window renewed only by new matching message IDs; Lively bypasses grouping. Arrival time comes from a monotonic clock, so live chat can still advance while video playback is paused. Source snapshots do not inflate counts or refresh memory. Matching removes Unicode punctuation and symbols before NFKC normalization, lowercases text, and collapses whitespace while retaining media identity. Emoji variation selectors and joiners are removed too. If stripping leaves no text, the original normalized reaction is used so unrelated symbol-only messages do not share an empty key. Paid and membership messages include their source ID in the match key and remain separate. The lookup holds at most 500 recent fingerprints and 1,000 observed IDs. A group keeps its display ID while source members leave the loaded window, but disappears from the feed when none remain. Counts include previously observed members that left the source. Edits move a message between groups. Hiding, seeking, density-mode changes, and session disposal clear memory.

Regular comments retain their own identities and carry the loaded vote-count label from their top-level comment renderer. The UI shares compact repeat/like badges between the box and floating styles, with distinct accessible labels. Floating content and count signatures are separate. Counts update in place without replacing the body, reading layout, or rewriting keyframes. Native animation speed is only updated when playback speed actually changes. Viewport dimensions come from ResizeObserver, with an initial measurement when the layer becomes visible. Scrolling transforms are composited independently, and ordinary playback ticks leave their timelines untouched.


## Quiet presentation

The header/status and footer occupy collapsible CSS grid rows. Hover, visible keyboard focus, customization, or active pointer capture reveal them. Pointer interaction exposes its active state to the panel, so controls remain available throughout drag/resize. Touch devices retain visible controls. Disclosure transitions respect reduced motion. The icon-only launcher inherits visibility from YouTube’s control bar. Session reconciliation restores it if YouTube replaces the controls; fullscreen without controls uses a small top-right fallback. Its shadow root isolates styling and input events from the player. This is presentation state, not a persisted preference.


The idle panel uses content height capped by the player-clamped saved height. Hover/focus restores the saved dimensions for controls and resizing. This CSS-only sizing also follows image loads, font changes, and expired comments without storing temporary dimensions.


`customizationBounds` owns the editor/preview arrangement as a pure geometry function. Panel manages visibility and keyboard focus across the two sibling regions in the same Shadow DOM. Escape and Done return focus to the invoking control. Theme and display changes immediately update the existing preview and collectors continue running.

## Interface languages

`src/i18n/locales` contains complete, bundled JSON catalogs for English, French, Spanish, German, Portuguese, Japanese, Korean, Simplified Chinese, Hindi, and Arabic. English source strings are typed message keys; catalog parity and interpolation tokens are tested. `I18n` handles browser-language matching, regional fallback, explicit overrides, number/plural formatting, and localized language names with built-in Intl APIs. There is no localization dependency or runtime download. Arabic count phrases use labels followed by numbers, avoiding incorrect two-form noun inflections.

The saved `interfaceLanguage` defaults to `auto`. Choosing another language reconstructs only the presentation layer, preserving collectors, playback, loading, and the optional comment-translation session. UI localization never processes author names or comment bodies. The overlay and launcher declare their language and direction; logical layout, radio-key navigation, and slider fills support RTL independently of danmaku motion. The popup reads the same saved preference. Extension-manager descriptions use packaged `_locales` metadata and follow the browser language ([Chrome locale reference](https://developer.chrome.com/docs/extensions/reference/api/i18n)).

The player control toggles the persisted overlay visibility in every display mode. Floating modes expose a separate customization control. The watch script starts at document start and installs native-chat concealment before reading preferences, then restores it immediately if Sideline is off. The style applies to replacement chat containers without waiting for polling or chat availability; session presentation manages layout, inert state, and restoration. Chat boxes use a 12 px backdrop blur with an opaque fallback for reduced transparency and forced colors.
