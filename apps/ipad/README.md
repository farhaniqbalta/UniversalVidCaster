# Native iPad app

Universal VidCaster is a SwiftUI iPad app using Google's official iOS Cast SDK
4.8.6 and Default Media Receiver. The embedded **UniversalVidCasterSafariExtension**
finds media for an explicit Open in app or clipboard transfer. User-confirmed TV video, audio,
subtitles, and functional checks are recorded in the
[validation results](../../docs/IPAD_NATIVE_CAST_RESULTS.md).

## Weekly reinstall with a free Apple account

[Apple Personal Team provisioning profiles](https://developer.apple.com/help/account/basics/about-your-developer-account)
expire after seven days. To reinstall the same app and its embedded Safari extension:

1. Open **[UniversalVidCaster.xcodeproj](UniversalVidCaster.xcodeproj)** in Xcode.
   Do not open the Swift Package workspace under `.swiftpm`; it is for tests.
2. In Xcode's toolbar, choose the shared **UniversalVidCasterApp** scheme and
   your connected iPad as the run destination. This scheme builds and embeds
   **UniversalVidCasterSafariExtension**; do not select the extension target to
   install the app.
3. Under **Signing & Capabilities**, select your Personal Team for both targets
   if Xcode asks. Keep the extension's `UVC_CONTAINER_BUNDLE_ID` equal to the
   app's bundle ID. The existing bundle IDs are retained across this project rename.
4. Unlock the iPad, then select **Product → Run**. Xcode reprovisions and installs
   the app and extension together. If Safari asks, re-enable the extension and
   grant website access.

You do not need to run `npm ci` for each reinstall. Run `npm run
build:safari-probe` after changing the Safari extension's TypeScript, HTML, CSS,
manifest, or images, or if its generated `dist` directory is absent. The generated
resources must exist before Xcode builds the extension.

## First build and install

1. From the repository root, run `npm ci` and `npm run build:safari-probe`.
2. Open `apps/ipad/UniversalVidCaster.xcodeproj` in full Xcode. Select the
   **UniversalVidCasterApp** scheme and allow the pinned Swift packages to resolve.
3. Configure the same development Team for the **UniversalVidCasterApp** and
   **UniversalVidCasterSafariExtension** targets.
   With a custom app bundle ID, set the extension's `UVC_CONTAINER_BUNDLE_ID`
   to that ID so its `.safari` identifier retains the containing-app prefix.
   Keep personal signing credentials and Xcode user state out of Git.
4. Connect/unlock/trust the iPad, enable Developer Mode if required, select it
   as the destination, and Run. The app displays as **Universal VidCaster**.
5. Enable its extension in Safari and grant website access. Disable an older
   standalone probe extension to avoid opening stale UI. See the
   [handoff guide](../../docs/IPAD_SAFARI_HANDOFF.md) for detailed steps.

The app targets iPadOS 17+. An unsigned build is a compile check, not an
installable physical-device artifact. Rebuild extension resources before Xcode
when changing its HTML/CSS/TypeScript.

## Find the code in Xcode

- **iPad App Source** contains the SwiftUI app, Cast service, and local HLS host.
- **iPad Safari Extension** contains the Swift extension handler, a
  **Safari Web Source (TypeScript)** folder reference, and generated web resources.
  The editable web source lives in `spikes/safari-google-cast/extension`; run
  `npm run build:safari-probe` after changing it.
- **Products** shows the app and its embedded `.appex`. Build and Run the
  **UniversalVidCasterApp** scheme to install both on the iPad.

## Use

1. Choose your TV in the app's **Destination** card, or start with Safari and
   choose a TV after importing. In Safari, start the video, open the extension, and choose **Find video**.
   Select video, method, and optional matching subtitle; choose **Open in
   Universal VidCaster**. If Safari cannot open the app, use **Copy transfer for
   iPad** instead.
2. Review the imported media summary in the native app. It shows the source host,
   playback method, and subtitle status; use **Edit video** or **Media options**
   to change inputs. For the copy fallback, use
   **Paste Safari transfer** with the system Paste control. Import does not
   start playback.
3. Use the official Cast button to select an existing Cast TV on the same network.
4. Choose **Direct** for receiver-accessible media or **Prepare on iPad** for the
   observed signed HLS master. Cast explicitly. iPad preparation sets HLS/fMP4/VOD
   automatically. An arbitrary webpage URL is not a media input.
5. After playback starts, the app can be backgrounded; the user reported a
   several-hour movie playing normally this way. Return to the app for controls.
   Setup and Now Playing are side by side in wide windows; use the mini-player
   in compact layouts.

For a baseline test, use the flower MP4 preset in **Diagnostics** (•••). Media
options → Advanced contains direct-mode MIME/format settings. Editing a link reveals its full value;
its collapsed summary displays only the host. Never use a redacted report URL.

## Subtitles and controls

New Cast connections request a receiver relaunch to recover a receiver left
behind the TV home screen. This can interrupt media already using the Default
Media Receiver. Automatic reconnection and video replacement within an existing
connection retain their normal behavior. If the TV receiver remains hidden while
already connected, disconnect with the Cast picker and select the TV again before
casting. Foreground behavior still requires verification on the actual TV.

Optional external WebVTT subtitles use a complete original URL and language tag
such as `en` or `id`. They retain their own authorization and load with the video.
Changing inputs does not alter an already-playing track; reload to attach or omit
it. The TV fetches captions directly. No in-session subtitle toggle, translation,
SRT conversion, or timing adjustment is implemented.

If Safari finds no matching subtitle, use its subtitle watch, close the popup,
toggle website captions off/on, then reopen and Refresh. Association is
provider-specific and does not prove exact timing or universal discovery.

Player controls include Play/Pause, Stop, a seek slider, and ±5 and ±15 seconds where
supported. Immediately below transport controls, one-tap presets select 0.5×,
0.75×, 1×, 1.25×, 1.5×, or 2× playback. The media-volume slider sends changes on
release; mute/unmute affects the current media stream. These are receiver-confirmed
values, not iPad speaker or necessarily TV system-wide volume. Unsupported actions
are disabled. See [speed/volume details](../../docs/CAST_SPEED_VOLUME.md).

Disconnect, Stop sharing, and End casting have distinct effects;
replacement and hosting cleanup require confirmation. End casting reports partial
outcomes without fabricating receiver state. Stop/Disconnect alone do not clear
hosting. Detailed session semantics and design ownership are in the
[architecture guide](../../docs/NATIVE_APP_ARCHITECTURE.md) and
[design integration notes](../../docs/CastDesign/INTEGRATION_NOTES.md).

## Hosting limits

The iPad preloads a finite on-demand HLS playlist graph in memory, then serves
playlists over local Wi-Fi; the TV fetches actual video/audio from source servers.
No Mac, cloud service, or extra TV app is required. To test independence, stop any
Mac bridge before preparing a fresh iPad session.

Limits: 32 playlists, nesting depth 4, 1 MiB per playlist, 8 MiB total. HTTPS
fetches use an ephemeral cookie-free session, no redirects, and bounded timeouts.
Missing `t`/`pm` parameters are supplied from the original session; existing child
query values are preserved. No live/encrypted HLS, variable substitution, segment
proxying, token renewal, transcoding, or mirroring.

The local listener uses Wi-Fi IPv4 and a dynamic port, random prepared paths,
GET/HEAD/OPTIONS with CORS, bounded connections/requests, and URL-free logs.
Hosting is configured to expire 30 minutes after preparation; upstream
authorization can expire earlier. Auto-lock is disabled while preparing/hosting
and restored on cleanup or expiry. A user-reported several-hour movie continued
normally with the app in the background. This confirms playback on that setup,
but does not establish that the local playlist server remained reachable after
suspension or expiry: the TV fetches media directly from the source. If playback
needs a playlist that is no longer available, return to the app, obtain a fresh
original link, and prepare again.

## Verification

With full Xcode selected, from the repository root:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swift test --package-path apps/ipad
```

Then build the iPad target and perform physical regression checks. Latest recorded
checks and remaining endurance, expiry, recovery, and accessibility gates live in
one [results sheet](../../docs/IPAD_NATIVE_CAST_RESULTS.md).

## Official references

- [Google iOS setup](https://developers.google.com/cast/docs/ios_sender)
- [Google iOS integration](https://developers.google.com/cast/docs/ios_sender/integrate)
- [Pinned SDK package](https://github.com/googlecast/google-cast-ios-sdk/blob/4.8.6/Package.swift)
- [SDK terms](https://developers.google.com/cast/docs/terms/)

Dependency binaries stay in Xcode's package/build directories. This development
app is not claimed ready for App Store distribution.
