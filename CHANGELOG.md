# Changelog

## 0.2.1 — 2026-10-12

- Reduce the leaf by 20% across icons, player controls, and artwork while preserving button sizes.
- Add five localized screenshots for each of ten interface languages, plus a European Portuguese regional set.
- Localize promotional tiles and store descriptions, and use descriptive localized extension titles.
- Improve compact display labels and use sideline@pourtaud.dev for extension support.

## 0.2.0 — 2026-10-11

### Added

- Mode-aware repeat grouping: Quiet remembers matching chat for 60 seconds, Balanced groups five-second bursts, and Lively preserves individual messages.
- Compact + counts for repeated chat and available like counts for timestamped regular comments.
- Matching that ignores case, punctuation, symbols, extra whitespace, and Unicode presentation variants, while preserving separate symbol-only reactions and media identity.
- A refreshed public README, contribution guide, issue templates, release downloads, and store artwork using real interface captures.

### Improved

- Group counters update in place without replacing the moving comment or restarting its animation.
- Reserved counter width prevents digit changes from affecting scrolling geometry.
- Player resizing preserves moving positions and animation clocks; followers account for the full comment width and a minimum gap.
- Playback events avoid rewriting unchanged animation rates.
- Density controls are available in every display style, including Chat box.
- Development tooling uses patched shell-quote and source-map-js versions. The remaining node-forge tooling advisory is documented in SECURITY.md.

### Scope

Comment processing remains local, with bounded in-memory repeat history. Paid and membership messages stay separate. Replies and all-comment scanning are not included. Store availability follows each store’s review process.
