# Contributing to Sideline

All contributions are welcome: a useful bug report, a translation correction, clearer documentation, a small cleanup, or a new feature. About half of Sideline was vibe-coded with AI assistance; help making it clearer, more reliable, and easier to maintain is especially welcome.

## Getting started

1. Fork the repository and create a branch for your change.
2. Use Node.js 24+, then run `npm ci` and `npm run check`.
3. Use `npm run dev` for Chrome or `npm run dev:firefox` for Firefox.
4. For a local demo without YouTube, run `npm run preview:ui` and open the fixture URL printed in the README.

For a larger feature or new dependency, open an issue first so we can agree on the direction. Small fixes can go straight to a pull request.

## Sending a pull request

Explain the problem, the resulting behavior, and how you checked it. Keep changes focused. Run `npm run check`, build both browsers, and run the browser checks affected by your change. For UI work, include screenshots or a short recording using synthetic comments, plus evidence for keyboard controls, narrow players, reduced motion, fullscreen, and navigation where relevant.

Full release checks and Firefox package lint are described in [BUILDING.md](BUILDING.md). CI checks the three browser engines and installed Chrome/Firefox packages. If an engine cannot run locally, say so; do not call it tested.

AI-assisted contributions are welcome. Read and understand the code you submit, verify its behavior, and describe any material limitations. Do not submit private transcripts, cookies, browser profiles, credentials, or unlicensed media.

## Project boundaries

- Keep YouTube selectors in `src/youtube` or `src/browser` integration.
- Keep core logic independent of WXT and DOM globals.
- Give every observer, timer, and listener a clear owner and cleanup path.
- Preserve local processing: no tracking, remote runtime code, broad host access, backend, or account mutations.
- Optional loading uses YouTube’s existing page handler; do not introduce private API calls.
- Render user content as text; never pass it to `innerHTML`.
- Prefer native APIs over runtime dependencies and explain new packages.
- Keep code comments short and focused on hidden constraints.
- Keep fixtures, marketing assets, and developer scripts outside `public/`, which is packaged in the extension.

## Interface translations

Catalogs live in `src/i18n/locales/*.json`. Keys are English source strings. Keep catalogs complete and preserve placeholders such as `{count}`, `{target}`, and `{author}`. Use `I18n.t` for owned UI strings and leave YouTube-authored content untouched.

To add a language, register its locale and autonym in `src/i18n/index.ts`, add metadata in `public/_locales` with a supported browser locale code, and extend the browser locale matrix. `npm run check` validates keys and placeholders; `npm run test:browser -- i18n.spec.ts` checks layout, persistence, browser defaults, popup text, and RTL behavior. Native-speaker reviews are welcome.

## Community

Be kind, specific, and constructive. Explain disagreements with evidence and respect the people doing the work. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Contributions are provided under the project’s [MIT license](LICENSE).
