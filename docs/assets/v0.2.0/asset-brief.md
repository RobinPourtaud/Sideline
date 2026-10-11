# Sideline v0.2.0 artwork

## Direction

Cream #FAF8F1, petrol #103E45, teal #3F9290, celadon #DCEAE2, lily #C5D880, and apricot #E6B491. Quicksand branding, generous spacing, and a consistent headline structure. Sideline’s existing Leafline mark is preserved exactly; the 128px store icon now has 16px transparent padding around its 96px mark.

The screenshots show actual Sideline UI from the synthetic browser fixture, with the same production source code. Font size, theme, position, and opacity are ordinary supported preferences. Scrolling animation clocks are paused at chosen positions for capture. Synthetic chat supplies +39 repeat counts; a loaded synthetic timestamped comment supplies the +128 like count. No private transcripts or third-party video screenshots are used.

The photo is an original generated fictional coastal scene, used as demonstration content. Promotional tiles use conceptual comment ribbons around that scene, not invented UI presented as a screenshot. The README hero and social preview reuse the genuine scrolling capture. Existing design explorations remain local and were not added to the public source.

## Sources and licensing

- Product mark: `src/assets/sideline.svg` and `public/mark.svg`; MIT, Robin Pourtaud.
- Typography: Quicksand, SIL Open Font License 1.1; license included in OFL.txt. Marketing only; the extension uses system fonts and does not load this font remotely.
- Coast scene: built-in image-generation tool, generated 2026-10-11, 1672 × 941 PNG. Copied to `coast-scene.png`; no API/CLI generation or API key required.
- Interface captures: `scripts/store-assets.mjs` and the local `tests/fixtures/watch.html` app.
- Current Pond tokens and Sideline product profile were reviewed from the local design reference; the active repository mark takes precedence over older proposal wording.

## Final generation prompt

```text
Use case: photorealistic-natural. Asset type: original demonstration video still for Sideline's README and extension-store screenshots. A sophisticated cinematic documentary photograph of a tranquil Japanese coast in late afternoon, viewed from an elevated winding seaside road. Teal sea fills the lower two thirds, a quiet curved bay and forested headland on the far right, warm apricot sunlight across silver-green water, a small pale ferry very far in the distance, restrained natural color grading, realistic fine film grain and subtle haze, calm summer atmosphere. Wide landscape composition 16:9, horizon in the upper third. The middle and left have broad uninterrupted water so real comment text can be placed over it later. Beautiful editorial travel photography, entirely original fictional scene. No UI, no screenshots, no frames, no words, no letters, no logos, no people, no promotional badges, no watermark. Fully opaque image.
```

## Deliverables

| File | Size | Role |
| --- | --- | --- |
| 01-scrolling.png | 1280 × 800 | Scrolling danmaku and live repeat counter |
| 02-chat-box.png | 1280 × 800 | Movable chat box |
| 03-timed-comments.png | 1280 × 800 | Timestamped reaction and like count |
| 04-customize.png | 1280 × 800 | Actual appearance and display controls |
| 05-themes.png | 1280 × 800 | Four genuine theme captures |
| promo-small.png | 440 × 280 | Chrome small promotional tile |
| promo-marquee.png | 1400 × 560 | Chrome marquee tile |
| readme-hero.png | 1600 × 800 | README introduction |
| social-preview.png | 1280 × 640 | GitHub/social sharing image |

HTML compositions keep typography, copy, screenshots, and the original mark separate; dependencies are bundled alongside them. `scripts/store-assets.mjs` reproduces the captures and exports. Run it against the local preview server as described in BUILDING.md. The numbered screenshots and promotional tiles are full-canvas RGB PNGs with no alpha, using the current [Chrome asset dimensions](https://developer.chrome.com/docs/webstore/images). Mozilla receives the actual-interface screenshots, not the conceptual promotional tiles. Final visual and raster checks are recorded in the release audit.
