# Contributing

Use Node.js 24+. Run npm ci, then npm run check. Before submitting changes, build both browsers, run browser tests, and lint the Firefox package as described in README.md.

Keep changes small and explain observable behavior, testing, and remaining limitations. Use synthetic or anonymized fixtures; do not commit real chat transcripts, cookies, browser profiles, or credentials.

## Boundaries

- Keep YouTube selectors inside src/youtube or the browser/playback integration.
- Keep core logic independent of WXT and DOM globals.
- Every observer, timer, or listener needs a clear owner and cleanup path.
- No API calls, backend, automatic comment loading, or account actions.
- No innerHTML for user-supplied content.
- Prefer native APIs over runtime dependencies. Explain new packages in the PR.
- Keep comments short and focused on hidden constraints.
- Test keyboard, pointer, narrow player sizes, fullscreen, source loss, and navigation for UI changes.

The WXT build includes only extension entrypoints and public assets; fixtures and developer scripts must stay outside public/.

## Interface translations

Translations live in `src/i18n/locales/*.json`. Keys are English source strings. Keep every catalog complete and preserve placeholders such as `{count}`, `{target}`, and `{author}` exactly; translated values are inserted as text, never HTML. Use `I18n.t` for owned UI strings and `I18n.count` for count phrases. Leave YouTube-authored content untouched.

To add a language, add its catalog, register its locale/autonym in `src/i18n/index.ts`, add extension-description metadata under `public/_locales` using a supported browser locale code, and extend the browser locale smoke matrix. `npm run check` validates keys and placeholders; `npm run test:browser -- i18n.spec.ts` checks layout, saved choices, browser defaults, popup text, and RTL behavior. Native-speaker wording reviews and corrections are welcome.
