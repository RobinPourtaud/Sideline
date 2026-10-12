# Safari for Mac

Safari support is a development preview. It is not yet published in the App Store. The Mac app embeds the same TypeScript extension used by Chrome and Firefox; it contains only local setup instructions and a shortcut to Safari’s extension settings.

## Build

Use Node 24+, npm, Xcode, and a Mac. The Xcode project targets macOS 13 and later. Older Safari versions still need validation; the first installed-extension checks use Safari 27 on macOS 27.

```sh
npm ci
npm run build:safari
open safari/Sideline/Sideline.xcodeproj
```

Select the **Sideline** scheme and **My Mac**, then select your Apple Developer team for both targets under Signing & Capabilities. Build and run. The project reads the compiled resources directly from `.output/safari-mv3`, so rebuild the web extension before building the Mac app after changing TypeScript or the manifest. Do not rerun Apple’s converter over this project; that would replace the custom setup UI and project settings.

To regenerate the Mac icon sizes from the existing product SVG:

```sh
npm run icons:safari
```

`npm run zip:safari` produces the web-extension ZIP for packaging/review, not an installable Safari app. Distribution requires a signed containing app and Apple review. Signing certificates, provisioning profiles, DerivedData, and local Xcode state are excluded from Git.

## Enable

1. Open Sideline and select **Open Safari Settings**.
2. Enable **Sideline** under Safari → Settings → Extensions.
3. Allow website access to **www.youtube.com**.
4. Open or reload a desktop YouTube watch page. Select Sideline in the player controls.

The extension requests local storage, script registration, and page access restricted to desktop YouTube. It does not request private-browsing access, native messaging, or access to other sites. Translation appears only when the browser exposes the on-device Translator API; it is normally unavailable in Safari.

## Safari-specific implementation

Safari does not support the `world` content-script manifest key used by the Chrome/Firefox comment-loading bridge. A Safari-only background script registers the same bounded bridge with `browser.scripting.registerContentScripts` in the MAIN world, only for `https://www.youtube.com/*`. Registration persists across sessions and avoids duplicates when the background restarts. This uses Safari’s supported extension API; it does not inject a script tag blocked by YouTube’s content security policy. No resources are made web-accessible.

Safari additionally requests `scripting` and the same explicit YouTube host permission to register this script. The page bridge accepts no commands or payloads from the page: it handles a fixed event and invokes only YouTube’s existing comment continuation controller. If registration fails or YouTube changes its loader, the existing bounded operation reports a stall. The registration API requires Safari 16.4 or later; older-version validation is still pending.

The Safari manifest omits Chrome’s minimum-version field and Firefox’s Gecko settings. The Chrome and Firefox entrypoints and manifests retain their original loading path.

## Validation

Before distribution, validate the **installed extension in Safari on a physical Mac**, including live/replay chat, timestamped comments and likes, auto-loading, grouping, all display styles, pause/resume, fullscreen, resizing, navigation, and preference persistence across tabs/relaunch. WebKit fixture tests are useful regression checks but do not prove Safari extension injection or native fullscreen behavior. iPhone/iPad support is outside this initial implementation; no simulators are needed.

## App Store preparation

The wrapper uses bundle IDs `dev.pourtaud.sideline` and `dev.pourtaud.sideline.Extension`. Before uploading, confirm those identifiers are available in your Apple Developer account, select the intended marketing version/build number, archive a Release build, and prepare the Mac App Store privacy declaration, screenshots, support URL, and reviewer instructions. Do not describe the development preview as available from the App Store.

### Initial validation — October 12, 2026

- Signed Debug Mac app built and launched on Robin’s physical Mac (macOS 27, Safari 27), using the existing Apple development team. Safari recognized the extension and the setup button opened its settings correctly.
- After the user authorized enabling the extension and YouTube access, signed-in live YouTube chat appeared in the chat box, including repeat counters. Scrolling, Quiet mode, playback pause/resume, navigation between live/recorded videos, and display-preference persistence through reload were exercised.
- Native video fullscreen entered and returned successfully, but the separate fullscreen surface was not inspectable by the UI tools. Overlay visibility there still requires a manual check before distribution.
- Real-site inspection exposed YouTube’s CSP blocking script-tag injection. After switching to registered MAIN-world content scripts and restarting Safari, the page had one bridge listener and automatic loading fetched 120 regular comments for a 100-comment target (YouTube batches can overshoot). The packaged background/bridge regression test also passed in WebKit.
- Type checking and formatting pass. All 64 unit tests, 80 shared WebKit browser cases, and the additional Safari packaged-bridge case pass. The 25 web resources in the signed extension bundle matched the Safari build byte-for-byte.
- Chrome and Firefox rebuild successfully with their existing main-world bridge and no Safari-only web-accessible resources.

### Store packaging — October 13, 2026

The 0.2.1 Release archive builds for both Intel and Apple Silicon. Safari uses separate localized extension names capped at 40 characters, as required by Apple’s upload validation. Chrome and Firefox keep their longer titles. The refreshed Mac icons and five screenshots use the approved smaller leaf. The planned App Store price is US $1.99 as a one-time purchase; the source, Chrome, and Firefox remain free. App Store submission and native fullscreen validation are still pending.

The current physical Mac check also confirmed that Sideline’s chat-box empty state stays visible when entering YouTube player fullscreen. This verifies overlay placement; live message delivery in fullscreen and native video-only fullscreen still need separate coverage. Apple extracted the approved smaller-leaf icon from build 2. The draft listing includes five screenshots, the Data Not Collected privacy declaration, and the reviewer setup instructions. Paid distribution is waiting on the owner’s bank and tax information.
