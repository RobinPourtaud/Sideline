# Security scope

Sideline runs on `https://www.youtube.com/*` and requests local storage only. Comment content is rendered with text nodes. Images and channel links use explicit YouTube/Google allowlists. The MAIN-world bridge accepts a fixed load event, not arbitrary code, URLs or continuation payloads. The runtime has no server, analytics, account mutations or remote executable code.

## Toolchain advisory — reviewed 2026-10-04

`npm audit` reports GHSA-86w9-cpqp-85rv in node-forge 1.4.0. Four high entries represent the same advisory propagated through `@devicefarmer/adbkit`, `web-ext` and `wxt`, not four independent runtime vulnerabilities.

The vulnerable RSA verification path is used by adbkit's TCP/USB authentication implementation. Sideline's supported build, package lint, desktop browser development and desktop smoke-test paths do not start an ADB TCP/USB server. node-forge is not imported by the extension entrypoints or included in the generated watch, preload or popup bundles. Android development/installation is outside the supported scope; do not expose an ADB bridge through this toolchain.

Upstream lists no patched version at review time: https://github.com/advisories/GHSA-86w9-cpqp-85rv . Track the upstream fix and update the lockfile when one is available. Do not use `npm audit fix --force`: its suggested major downgrades are not a validated fix for this project. The audit finding is retained, not suppressed. This is a documented development-tooling risk assessment, not a claim that the dependency itself has been repaired.

Reassess this conclusion when enabling Android workflows, changing build imports, or updating web-ext/WXT. Re-run the audit and production builds with every dependency update.
