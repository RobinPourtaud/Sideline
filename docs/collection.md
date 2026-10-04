# Collection decision record

Updated: 2026-10-04

## Decision

Read comments from YouTube’s existing DOM. Do not call the Data API or private endpoints directly, force scrolling, or create extra chat frames. Optional auto-loading invokes YouTube’s existing continuation handler, in the MAIN world, without accepting caller-supplied endpoints or commands. Keep each collection adapter replaceable.

Auto-loading is Off by default. Saved targets of 100, 300 or 500 apply while Sideline is enabled. Batches keep the current YouTube sort, exclude replies, stop after six seconds without progress or thirty seconds overall, and report the actual loaded count. Off suspends collection and automatic loading. Resuming rescans existing sources.

## Policy status

Technical feasibility does not establish permission. YouTube's published terms restrict automated access and certain collection/reuse; no explicit exemption for local DOM-only extensions was identified. The optional continuation loader is automated pagination through YouTube’s own UI implementation; it is not passive DOM reading. Local processing and no direct API requests do not establish a policy exemption. The former passive-only rationale does not cover this feature. Store submission remains a separate decision.

Sources reviewed:
- https://www.youtube.com/static?template=terms
- https://developers.google.com/youtube/terms/developer-policies
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://extensionworkshop.com/documentation/publish/add-on-policies/

## Coverage language

Use counts of threads loaded and timestamp references found. Do not show a percentage of all comments: YouTube's displayed total can include replies, while the selected sort and loaded pages only expose a subset.

Mirror and display the native chat filtering mode. A missing source is different from a quiet but connected chat. Fullscreen can unload the native frame; retain the last view but clearly mark it as unavailable.

## Deferred

Uninterrupted fullscreen chat needs further investigation in supported browsers. Any proposal that collects extra data or changes the source strategy needs a separate architectural and policy review. Optional on-device translation is implemented. External translation services remain out of scope.
