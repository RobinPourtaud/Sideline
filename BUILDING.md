# Building and packaging Sideline

Use Node.js 24+ and npm. No credentials, API keys, remote runtime services, or private packages are required.

## Reproduce the extensions

From a clean checkout or the extracted reviewer source archive:

```sh
npm ci
npm run build
npm run build:firefox
```

The output folders are `.output/chrome-mv3` and `.output/firefox-mv3`. WXT prepares its generated TypeScript configuration during `npm ci`. The committed PNG icons are used as-is; no image-generation service or font download is needed to build.

```sh
npm run zip
npm run zip:firefox
```

These commands create browser ZIPs and reviewer source archives in `.output/`. Use the Firefox MV3 package, not a Chrome package renamed as XPI. GitHub release packages are unsigned; Mozilla signs store-distributed builds after submission. This repository does not publish an npm library, so `private: true` in package.json is intentional.

## Validation

```sh
npm run check
npx playwright install chromium firefox webkit
npm run test:browser
npx web-ext lint --source-dir .output/firefox-mv3 --warnings-as-errors
npm audit --omit=dev
```

Browser tests use synthetic fixtures. The installed Chrome checks need a Chrome production build. Installed Firefox validation additionally requires `geckodriver` and `openssl`:

```sh
npm run test:firefox-extension
```

Set `GECKODRIVER` or `FIREFOX_BINARY` when the executables are not on PATH. The test creates and removes a temporary profile and certificate; those files do not belong in source archives. CI validates the installed packages on Linux. Local Firefox profile failures and live-site validation limits are recorded in [docs/testing.md](docs/testing.md).

## Marketing assets

The README and store artwork live in `docs/assets/v0.2.0`, outside the extension package. To regenerate the deterministic layouts and real-interface captures:

```sh
npm run preview:ui
# In another terminal:
npm run assets:store
```

The original demonstration scene and licensed font are committed, so this export needs no image-generation API. The asset brief records provenance. `npm run icons` regenerates the extension icons from the original SVG mark.
