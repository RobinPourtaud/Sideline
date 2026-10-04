# Testing

The suite separates deterministic behavior from YouTube's changing service. No claim of exhaustive testing is made.

## Layers

| Layer | Checks |
| --- | --- |
| Core / Vitest | Malformed preferences, geometry bounds, timestamp validation, seek windows, burst caps |
| Browser fixtures / Playwright | Chat updates and deletion, emoji, safe text rendering, persistence, pointer/keyboard geometry, fullscreen, frame loss/replacement, cross-origin failures, seeking, ads, SPA cleanup, pause/resume, timestamps and replies |
| Accessibility / axe | Default dark/light settings and system-theme feed, with keyboard and 200% layout checks |
| Load fixture | 1,000 messages added in one batch; at most 120 rendered rows, at most two render batches, bounded settle time |
| Installed Chrome extension | Production manifest injection, iframe collection, real extension storage, exclusion of non-YouTube pages |
| Installed Firefox extension | Temporary production add-on through geckodriver; injection, iframe collection, storage, fullscreen and source loss |
| Live YouTube smoke | Manual/interactive service check, kept outside deterministic CI |

## Commands

Use Node 24+ and npm ci. Then:

```sh
npm run check
npm run build
npm run build:firefox
npx web-ext lint --source-dir .output/firefox-mv3 --warnings-as-errors
npx playwright install chromium firefox webkit
npm run test:browser
npm run test:firefox-extension
npm audit
```

The Firefox installed-extension script requires geckodriver and openssl. FIREFOX_BINARY defaults to Playwright's Firefox; GECKODRIVER defaults to the executable on PATH. Its temporary HTTPS proxy only forwards the local YouTube-hostname fixture. It neither changes system DNS nor expands extension permissions.

For constrained machines, use --workers=1. For container testing, allocate shared memory (for example Docker --shm-size=1g). Browser startup and accessibility analysis can otherwise time out under contention.

## Validation record — 2026-09-20

- Chrome for Testing 153 on macOS: fixture tests and installed-extension smoke.
- WebKit 26.6 on macOS: shared UI fixture tests. This does not validate Safari extension packaging.
- Firefox 155 on Linux: installed-extension smoke and shared UI fixture tests.
- Firefox on this macOS host could not launch a test profile; both the Playwright build and an official Firefox download failed before loading extension code. Native macOS Firefox remains unverified.
- On the actual YouTube example BT7Qs-DVTDI in headed Chrome, the installed extension displayed replay chat and continued receiving messages after fullscreen entry. The earlier Orca session unloaded its chat document during fullscreen instead. Source-loss handling must remain covered.
- On the active Lofi Girl stream rFZHOHl-L8A in headed Chrome, the installed extension displayed 76 loaded messages and received eight new messages in an eight-second observation. This is a functionality smoke check, not a sustained benchmark.
- Headless Chrome received YouTube's unsupported-browser chat page; it is not a valid substitute for that live-site check.
- TypeScript, Biome, unit tests, both production builds, Firefox package lint, and dependency audit are part of the release checks.

Initial preview result: 17 unit tests, 42 UI checks (14 per engine), and both installed-extension smoke checks passed. The Chrome-only Playwright extension test is intentionally skipped in Firefox/WebKit projects; Firefox installation is covered by the separate geckodriver script.

The image-size package override patches a transitive development-only extension-linter dependency. Revisit it when upstream includes the patched version. The final full npm audit reported zero vulnerabilities.

The generated Firefox sources ZIP is a build/review archive; WXT excludes test files. Use the repository for the complete test suite.

## Remaining manual coverage

Before store release, repeat live-site checks on Chrome and Firefox desktop, including a busy active stream, replay seeking, native comment loading, browser restart, theater mode, navigation during an ad, and long sessions. Test VoiceOver/NVDA and high-contrast settings manually. Minimum declared browser versions, Windows, Android, and Safari extension packaging have not been validated.

Opacity below the default depends on the underlying video and cannot guarantee contrast. The performance fixture demonstrates bounded work; it is not a sustained real-world CPU or memory benchmark.

## Translation validation — 2026-09-20

The updated suite has 24 unit tests and 51 shared UI checks (17 per engine). Chromium and WebKit run on macOS; Firefox runs in the official Playwright Linux container. The installed Chrome smoke also verifies native translation controls in the isolated content script and persistence of language choices. The extension still requests only storage and YouTube page access.

Translation fixtures substitute a controlled native API to test opt-in, source/target preferences, originals, disabling while paused, unavailable language packs, unsupported browsers, and accessibility. Unit tests cover deduplication, bounded pending work, replacement of stale work, failures, cancellation, setup timeout, late creation cleanup, and preference migration. These tests do not validate model quality or actual language-pack delivery.

A headed Chrome 153 installed-extension probe found the native Translator API and reported an English/French language pair as downloadable. A real create request stayed in setup for the 60-second observation; no actual translated output was obtained. Native model download and translation remain a manual validation gap. The UI times out stalled setup, permits retry, and keeps originals available. Successful native translation should be verified on a supported user installation before treating this feature as release-ready.

API reference: https://developer.chrome.com/docs/ai/translator-api

## Display and usability update — 2026-09-20

Validation now includes 25 unit tests and 66 shared browser UI checks (22 each in Chromium, Firefox, and WebKit), plus installed Chrome and Firefox smoke checks. The Firefox checks run on Linux; native macOS Firefox remains unverified.

Added coverage: all four themes with axe, box-size presets, independently saved chat/floating text sizes, scrolling lane caps under a 1,000-message burst, video pause/resume, speed/direction selection, fullscreen, top/bottom placement, repeated seeks, animation expiry without duplicate replay, reduced motion, hiding, and small-player bounds. The revised controls were also inspected interactively in Orca. These are fixture-based checks; a sustained live-site danmaku benchmark remains manual coverage.

The review found that an unlabeled gear hid important choices, translation dominated the settings, and a shared font size would make switching styles awkward. Source and style are now primary labeled selectors, Customize/Done are visible actions, translation is collapsible, and styles expose only their relevant controls. The four named themes preserve existing preference values. No dependencies or browser permissions were added.

## Visual simplification — 2026-09-20

Controls now use custom radio tiles, swatches, segmented buttons, and styled range tracks. The suite additionally checks absence of native select menus, keyboard theme selection and focus, collapsed advanced controls, opacity-control visibility, and reduced-motion transitions. Current suite: 25 unit tests and 69 shared browser checks (23 per engine), plus installed-extension smoke checks. Earlier sections describe their respective implementation snapshots.


## Profiles and chat media (2026-09-20)

The suite now includes 27 unit tests and 75 shared browser checks (25 per engine), plus installed-extension smoke checks. Media fixtures cover author/channel metadata, member badges, inline custom emoji, sticker-only messages, source deletion, image-source updates, broken-image fallbacks, and timestamped-comment identity. URL tests reject unsupported hosts, credentials, non-HTTPS schemes, ports, and non-channel destinations.

The example video BT7Qs-DVTDI was inspected in Orca: replay avatars used yt4.ggpht.com, membership badges and custom emoji used yt3.ggpht.com, and author handles were plain spans. No loaded Super Sticker was present, so that renderer remains fixture-tested rather than confirmed against a live sticker. Standard Unicode emoji remain text. Native macOS Firefox and Safari extension installation remain unverified.


## Combined feed (2026-09-20)

Chat and active timestamped comments now share one arrival-ordered feed. Core tests cover stable interleaving, bounded snapshots, expiry/deletion, reset, ID collisions, and migration away from the source preference. A browser scenario checks both sources together, whole-feed pause/resume, timed expiry, and seeking while paused. The suite contains 30 unit tests and 78 shared browser checks (26 per engine), plus installed-extension smoke checks.


## Quiet overlay (2026-09-20)

Hover/focus tests cover the quiet default, disclosure, customization and pause persistence, touch access, reduced motion, and scroll following when controls resize the feed. Interaction fixtures now hover explicitly before using controls after reload. The suite includes 30 unit tests and 90 shared browser checks (30 per engine), plus installed-extension smoke checks. The browser binaries on macOS were unavailable for this pass, so browser validation uses the installed Linux Playwright image.


## Customization beside comments (2026-09-20)

The suite now includes 32 unit tests and 99 shared browser checks. Editor placement tests cover left/right space, temporary repositioning, narrow-player stacking, and floating-mode bounds. Browser checks verify live comments during editing, theme preview, closing back to saved geometry, and narrow/fullscreen layouts. Existing appearance, translation, accessibility, and quiet-view cases also exercise the separate editor.

## Full review (2026-09-20)

See [the review report](review-2026-09-20.md) for findings, severity, and remaining risks. Added four unit cases and seven shared browser cases. The suite now has 36 unit tests and 126 shared browser checks (42 per engine), plus an installed Chrome smoke and the separate Firefox add-on smoke. Manual feed pause has been removed; references to it in earlier sections describe older snapshots.

New coverage includes stale chat frames during navigation, edited timestamp references, late permalinks, removed comment content, floating snapshot restoration, small-font lane spacing, in-place floating text and translation updates, cancelled translation restarts, late completions, disposed sessions, and malformed timestamp URL schemes/credentials/ports. Existing customization checks now sample geometry atomically and check player/overlay scroll positions.

The full browser run initially passed 119 cases, skipped the two non-Chrome copies of the Chrome install test, and reported five failures. Investigation found a fixture-only inline-video baseline gap, an animation-attachment race in a new test, and two WebKit process crashes during accessibility/screenshot work. The fixture and timing checks were corrected; focused reruns verify the affected paths. Tests run serially in Linux Playwright containers on this machine. These runs do not constitute a new live YouTube smoke test.

Final verification: TypeScript, Biome, all 36 unit tests, both production builds, Firefox package validation, and npm audit passed. The 126 shared browser cases passed across the full run and focused reruns after fixes; this was not a single uninterrupted green run. The final customization checks passed in Chromium, Firefox, and WebKit. Both installed-extension smoke tests passed with the rebuilt packages. No unresolved assertion failures remain from this review; WebKit process stability under prolonged local test runs remains an environment limitation.


## Native chat presentation (2026-09-20)

The native source remains loaded while its container is transparent, removed from normal layout, and inert. Two new shared scenarios check incoming messages, restoration of accessibility attributes and existing inline styles, navigation cleanup, and opening a collapsed chat through its standard button without repeated clicks. All 24 targeted presentation/review checks passed across Chromium, Firefox, and WebKit; all 36 unit tests passed.

The actual ChatPresentation implementation was exercised against BT7Qs-DVTDI in Orca: 84 new replay messages arrived while the native container had opacity zero, the iframe document stayed unchanged, and disposal restored the native panel. This confirms the concealment approach on that replay; it does not guarantee YouTube will retain its iframe through every fullscreen transition.

## Fullscreen chat column (2026-09-21)

Fullscreen now collapses YouTube's reserved side column when concealed chat is its only open panel. Other engagement and playlist panels retain their space. A player ResizeObserver signals resize so YouTube updates its inline video dimensions; cleanup disconnects it and restores sizing.

All nine targeted presentation checks passed across Chromium, Firefox, and WebKit, including fullscreen entry/exit, incoming messages, another panel opening, resize notification, and native chat restoration. TypeScript, Biome, 36 unit tests, and both production packages passed. On the real example replay in Orca, both player and video filled the 1440-pixel viewport with a zero-width chat column; before the fix, the column reserved 396 pixels.

## Background comment preloading (2026-09-21)

The optional 100-comment loader invokes YouTube’s existing continuation handler without scrolling or direct API requests. Live testing on BT7Qs-DVTDI confirmed initial loading from zero comments and further batches up to 100 while scrollY stayed zero. The page had a hidden duplicate comments container; collection now selects the active container.

Nine new browser checks passed across Chromium, Firefox, and WebKit: bounded batches, unchanged scroll position, collected timestamp playback, fullscreen, stop/navigation cleanup, stalled-handler deduplication, partial counts, and excluding reply continuations. Initial test failures came from fixture timestamps pointing to localhost and a copy of the test using outdated singular/plural text; corrected fixtures passed. Installed Chrome and Firefox smoke tests also exercised the actual MAIN-world bridge from the isolated overlay. All 36 unit tests, TypeScript, Biome, both production builds, and Firefox validation passed. The YouTube handler is undocumented; future changes can prevent loading, and the UI reports the actual partial count without a scrolling fallback.

## Automatic loading and continuous danmaku (2026-09-21)

Auto-load is a saved Off / 100 / 300 / 500 setting, applied per video while Sideline is enabled. Added a preference validation test and an automatic-load browser scenario covering startup and YouTube navigation. Turning Off cancels further requests.

Scrolling comments now share a constant pixel speed and can follow each other within a lane. New browser cases verify admission before the previous comment exits, non-overlapping spacing, complete long-text traversal, and completion after source eviction. Existing speed assertions now check the time to cross one screen width rather than total travel time including the comment width.

All 37 unit tests and 57 targeted browser checks passed across Chromium, Firefox, and WebKit. Coverage includes automatic loading, display settings/accessibility, pause, fullscreen, seeking, reduced motion, emoji/stickers, and in-place translation. TypeScript, Biome, both production builds, and Firefox package validation passed.

Final installed Chrome and Firefox smoke checks passed with the saved auto-load control. A focused Chromium rerun also passed danmaku flow and media checks after the final content-size observer adjustment.

## Interface internationalization (2026-09-21)

Bundled ten complete interface catalogs (101 messages each), automatic browser-language selection, saved overrides, localized popup/extension descriptions, and Arabic RTL support. Unit tests check catalog parity, placeholders, locale negotiation, preference validation, localized counts, and literal interpolation. An initial Arabic-digit assertion assumed a numbering system that varies across ICU versions; the corrected test checks localized wording and independently verifies German number formatting.

All 40 unit tests passed. A 51-case browser pass covered all ten interfaces, saved overrides, browser defaults, RTL danmaku independence, display/accessibility controls, automatic loading, and comment translation. Final focused checks passed all 15 localization cases across Chromium, Firefox, and WebKit, adding popup layout, RTL keyboard behavior, and preservation of active comment translation across interface-language changes. These runs cover 57 distinct shared browser checks. The actual installed Chrome extension also preserved the saved language across reloads. TypeScript, Biome, both production packages, and Firefox package validation passed. Arabic layout was visually inspected in Orca; the slider fill direction was corrected. Catalog completeness is automated; native-speaker wording reviews remain welcome.

The installed Firefox add-on smoke also passed, including changing the interface to Japanese and retaining it after reload.

## Timestamp sections (2026-09-22)

Thirty-six targeted browser checks passed across Chromium, Firefox, and WebKit, including nine new checks for multiline and inline sections, out-of-order times, duplicate references, unrelated video links, introductory text, author/emoji preservation, and edits back to a single timestamp. The existing media and comment-edit regression suites also passed. All 40 unit tests, TypeScript, and Biome passed.

## Overlay toggle, early concealment, and blur (2026-09-22)

The player button now toggles the complete overlay in every display mode and retains a pressed state; floating customization has a separate button. Added browser coverage for keyboard toggling, saved on/off state after reload, immediate concealment while preferences resolve, and replacement chat containers before collection is available. Existing fullscreen, native-chat restoration, display, and timestamp-section checks were exercised across Chromium, Firefox, and WebKit. Chat boxes now use a bounded backdrop blur and opaque surfaces for reduced transparency or forced colors.

The checks caught and fixed a fallback icon overlapping fullscreen controls and a tooltip still attached to the former combined control. The startup fixture now uses a served document: Chromium blocked module imports from the intercepted navigation used initially. One WebKit process closed during the theme check; a focused rerun was required. These checks use Linux browser engines, not an installed Safari extension.

Final validation: 40 unit tests and 45 distinct targeted browser checks passed across the three engines, including the focused reruns. Installed Chrome and Firefox extension smoke checks passed on the rebuilt packages; TypeScript, Biome, and Firefox manifest validation also passed with no warnings.

## Release-readiness fixes (2026-10-04)

Added regressions for five-playback-second queue expiry, available-row Lively, collection suspension while Off, avoiding hidden chat rows, legacy preference migration, independent concurrent settings writes, and installed Chrome cross-tab updates. SVG marks now use namespaced DOM creation rather than parsing strings; a Trusted Types fixture verifies initialization and matching geometry against the original assets.

TypeScript, Biome, and all 47 unit tests pass. CI on `551193d` passed all six independent jobs: Chromium, Firefox, WebKit, installed Chromium, installed Firefox, and package/build checks, including Firefox manifest validation. Run: https://github.com/RobinPourtaud/sideline/actions/runs/37193997651. The subsequent SVG change passed all four focused Chromium readiness tests locally; its complete CI result is recorded on the PR.

The local combined Chromium/WebKit run passed 131 cases, skipped two installed-Chrome copies in WebKit, and had nine failures under concurrent host load; it is not a clean full-suite pass. Local Firefox could not open its temporary profile. Linux CI provides the clean cross-engine and installed-package results. These distinctions matter when reproducing the checks.

The actual app bundle initialized on BT7Qs-DVTDI and jfKfPfyJRdk in Orca after the SVG change, with memory-only preferences, and was disposed afterward. Both pages exposed no chat iframe in this session. This validates page initialization and the missing-source state, not incoming real-stream messages or installed-extension execution on those pages. Fresh real-stream/fullscreen performance validation remains a manual release check.

The development-only node-forge advisory remains upstream and is documented in SECURITY.md. No dependency downgrade, audit suppression, or unsupported claim of a patched toolchain was introduced.
