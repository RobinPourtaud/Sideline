# Collection decision record

Date: 2026-09-20

## Decision

Read comments already loaded by YouTube. Do not use the Data API, private endpoints, automatic pagination, forced scrolling, or extra chat frames. Keep each collection adapter replaceable.

An Orca inspection of video BT7Qs-DVTDI found readable replay messages and timestamp links. A separate experiment reached 100 regular comment threads through scrolling, but that automation is deliberately absent from Sideline.

## Policy status

Technical feasibility does not establish permission. YouTube's published terms restrict automated access and certain collection/reuse; no explicit exemption for local DOM-only extensions was identified. Reading already-loaded comments avoids automatic pagination but is not claimed to be policy-approved. Store submission remains a separate decision.

Sources reviewed:
- https://www.youtube.com/static?template=terms
- https://developers.google.com/youtube/terms/developer-policies
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://extensionworkshop.com/documentation/publish/add-on-policies/

## Coverage language

Use counts of threads loaded and timestamp references found. Do not show a percentage of all comments: YouTube's displayed total can include replies, while the selected sort and loaded pages only expose a subset.

Mirror and display the native chat filtering mode. A missing source is different from a quiet but connected chat. Fullscreen can unload the native frame; retain the last view but clearly mark it as unavailable.

## Deferred

Uninterrupted fullscreen chat needs further investigation in supported browsers. Any proposal that collects extra data or changes the source strategy needs a separate architectural and policy review. Translation and external services are out of scope.
