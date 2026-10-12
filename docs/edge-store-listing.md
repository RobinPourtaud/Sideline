# Microsoft Edge Add-ons listing

Reuse the Chromium package built by `npm run zip`. Microsoft Edge Add-ons accepts Chromium WebExtension packages through Partner Center. Test the installed package in Edge before submitting; the Chromium browser tests alone do not establish an installed Edge test.

Use the localized titles in `store-titles.json` and descriptions in `store-descriptions.json`. Add only relevant search terms: YouTube, danmaku, live chat, video comments, timestamped comments. Keep the proper name Sideline unchanged.

- Category: Entertainment, if available in the dashboard.
- Support and marketing: https://pourtaud.dev/projects/sideline/
- Support email: sideline@pourtaud.dev
- Privacy: https://pourtaud.dev/sideline/privacy/
- Source: https://github.com/RobinPourtaud/Sideline
- Price: Free. No Sideline account or in-app purchases.
- Icon: `public/icons/128.png`.
- Screenshots: the five numbered 1280 × 800 PNGs for each language in `assets/v0.2.0`; localized variants live in `localized/<locale>`.

The five images fit Edge’s six-screenshot limit per language. Use language-specific uploads rather than duplicating English across translated listings. Promotional artwork is separate from the actual-interface screenshots. Do not claim on-device translation is available in Edge until its API support has been checked in the installed browser.

The listing should disclose that about half of the code was vibe-coded with AI assistance and invite all contributions, as the localized descriptions already do. The public website must not claim Edge store availability until the listing is approved and its URL exists.

Publishing requires a registered Microsoft Edge extension developer account in Partner Center. Account registration and any agreement acceptance remain separate from preparing this package and listing.

References: [Microsoft’s publishing guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension), [registration](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account).
