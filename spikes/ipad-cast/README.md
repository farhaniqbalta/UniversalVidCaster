# Native iPad Cast test app

## Safari transfer (new)

The app now embeds the shared Safari diagnostic extension as **VidCasterSafari**.
Select video/method/optional subtitle in Safari and use **Copy video + subtitle for
app**, then **Paste Safari transfer** in the app to fill setup together. Playback
still requires review and an explicit Cast action. See the
[installation and iPad test guide](../../docs/IPAD_SAFARI_HANDOFF.md), including
Team selection for the new extension target. Build extension resources with
`npm run build:safari-probe` before Xcode builds. Physical iPad handoff is pending.

## Redesigned workspace

Design changes are isolated from session behavior. See the
[architecture and design-swap guide](../../docs/NATIVE_APP_ARCHITECTURE.md).
WorkspaceSession owns state/actions behind injectable Cast/host interfaces;
presentation, theme tokens, and fake design previews can be edited independently.
The app composition root keeps a single session alive across screen changes.

The app now displays as **Universal VidCaster**, with Setup and Now Playing side
by side on wide iPad windows. On smaller widths, tap the mini-player to open Now
Playing. Existing Cast and iPad playlist services are retained.

Paste the original media URL, choose **Direct** or **Prepare on iPad**, optionally
include WebVTT subtitles, select a TV with the official Cast icon, and cast. iPad
mode sets HLS/fMP4/VOD automatically. Use Advanced for direct MIME overrides;
the public flower and legacy Mac settings presets moved to **Diagnostics** (•••).
The URL field collapses to its hostname summary after Paste; Edit reveals it.

Player controls now include a seek slider, +/-15 seconds, Play/Pause, and Stop.
Session actions distinguish Disconnect, Stop sharing, and End casting. Replacement
and hosting cleanup require confirmation. End casting reports what was acknowledged,
cleared, or requested; it does not force receiver truth to idle/disconnected.
Host expiry is separate from token expiry. Foreground operation remains required.

See [design integration notes](../../docs/CastDesign/INTEGRATION_NOTES.md) for changes
and physical review steps. Nineteen native tests and unsigned device/simulator
builds pass; physical verification of this new UI remains pending. Earlier form-based
instructions below document the service baseline and may use old button names.

## Optional native subtitles

Native external WebVTT loading is implemented for direct, Mac bridge, and iPad-local
HLS modes. Expand **Subtitles (optional WebVTT)**, turn on **Include subtitle on
next load**, paste the complete original subtitle URL for the exact video, and
enter language (`en`, `id`, or a language tag such as `en-US`). Load/prepare again
to attach and activate the track. This reloads media using the start-position field.

The TV fetches the subtitle directly with that URL's own token; it is not fetched
or rewritten by the iPad playlist host. Appropriate CORS and valid authorization
are required. Blank/invalid URLs and malformed language input are rejected without
logging private values. Turn inclusion off and reload for a video without the
external track. Existing playback is unaffected by merely editing/toggling input.
No in-session toggle, automatic discovery, token renewal, translation, SRT conversion,
or timing adjustment is implemented. Safari subtitle discovery remains deferred.

Sixteen native tests and the unsigned iOS build pass. Physical subtitle rendering
and synchronization remain pending; the video playback results do not cover them.

## Foreground iPad hosting (no Mac bridge)

Updated 2026-10-23: foreground operation is acceptable per the user's revised
requirement. Native playlist preparation and hosting are implemented; physical
Detailed Mac-free TV validation is pending; the user confirmed HLS preparation.
Native subtitles are implemented as described above. All 16 native tests
and the unsigned iOS build pass, including manifest authorization and loopback
HTTP serving checks. Real iPad-to-TV local listener reachability is unverified.

1. Build/run the updated app from Xcode on your iPad.
2. Get a fresh original HTTPS master URL with `t` and `pm` from the Safari
   diagnostic extension. Paste that original URL in the iPad app, not a Mac bridge
   URL or redacted report link. Initial acquisition can still use Mac Safari;
   iPad Safari detection/handoff is a separate pending step.
3. Turn on **Prepare HLS on this iPad (no Mac)**. Connect to the TV on the same
   Wi-Fi. Tap **Prepare on iPad & play**. HLS MIME/fMP4 and VOD are automatic.
4. Keep the iPad app foregrounded; auto-lock is disabled during preparation and
   hosting. Check correct video, audio, seek, pause/play, and stop.
5. For independent validation, stop the Mac bridge before preparing this new
   session. Buffered playback of an old Mac session does not establish success.
6. Use **Stop iPad hosting and clear session** when finished to discard playlists,
   close the listener, and restore auto-lock. Stop Cast playback first if desired.
   Cast Stop/Disconnect alone does not clear the playlist host. Session expiry
   after 30 minutes also stops hosting/restores auto-lock; source tokens may expire
   earlier. Prepare a fresh session to recover.

Implementation: preloads up to 32 playlists / nesting depth 4 into memory, up to
1 MiB each and 8 MiB total. A selected master’s referenced video/audio/iframe
playlists are prepared, so a large multi-variant master may hit these limits.
HTTPS playlist requests use an ephemeral cookie-free session, no redirects, and
15-second request / 20-second resource timeouts. Finite VOD only: no encryption,
variable substitution, live streams, segment proxying, token refresh, or media
transcoding. Existing child query bytes are preserved; missing t/pm are supplied
from the original session. The TV downloads initialization/media directly.

The listener uses the iPad's Wi-Fi IPv4 address and a dynamic TCP port, serves
only prepared random paths, supports GET/HEAD/OPTIONS with CORS, limits connections
and request sizes, and logs no URLs. No TV app, hosted service, or broad ATS
exception was added. Local-network access and actual TV reachability still need
physical validation. Switching away or locking may suspend hosting; return to the
app to recover, and prepare a fresh session if necessary.

Screen-awake behavior, Wi-Fi changes, permission failures, expiry recovery, and
physical Mac-free playback remain device-test gates. This is not a Safari-only
controller or a background server promise.

Part 2 implementation, 2026-10-21. Standalone native test client using Google's
official iOS Cast SDK, **not a Safari bridge**. No Python or macOS helper is used.
The Safari diagnostic extension remains a separate target and is unchanged by
this app. No project-specific TV installation is needed.

## Open and run on your iPad

1. Open `iPadCastTest.xcodeproj` in Xcode. Allow Swift Package Manager to resolve
   the pinned Google Cast 4.8.6 dynamic product and its dependency.
2. Select the **iPadCastTest** scheme. Under the target's **Signing & Capabilities**,
   choose your development team and a unique bundle ID. Do not commit your team,
   provisioning credentials, or Xcode user state.
3. Connect/unlock the M1 iPad Pro and trust the Mac if prompted. Enable Developer
   Mode on the iPad if required. Select that iPad as the run destination and Run.
4. Open **iPad Cast Test** on the iPad. Keep it and the Cast TV on a network that
   permits discovery. Tap the Cast icon and allow Local Network access.
5. Select your existing Google Cast-enabled TV. Connection alone does not mean
   media is playing. The app uses Google's Default Media Receiver.
6. Keep the **flower MP4 preset**, then select **Load & play**. Confirm both the
   app's receiver-reported PLAYING state and visible video on the TV.
7. Exercise Pause, Play, Seek (try 1 second), Stop, and Refresh receiver status.
   The clip is only about five seconds long; reload if it ends before a control.
8. Disconnect leaves playback running where supported. Use Stop first to stop
   the video. Background/foreground the app and check status refresh/reconnection.

This app targets iPadOS 17+. Development is intended for the user's M1 iPad Pro,
reported iPadOS 27.0.1. Signing/install, discovery, permission handling, and playback
have not yet been validated on that device. An unsigned build is not installable
directly on a physical iPad.

## Test the website candidate later

### Mac bridge test after the flower baseline

The user confirmed native flower MP4 TV playback and Pause/Play/Seek/Stop on
2026-10-23. The app now offers **HLS uses fragmented MP4 audio/video** and
**Use Mac bridge HLS settings**, mapped to both SDK audio/video segment formats.
The flower preset resets the format option to off. Non-HLS MIME with the option
on is rejected before loading. Seven native input tests and the unsigned iOS
build pass; physical HLS playback from iPad remains pending.

1. Build/run the updated iPadCastTest target on the iPad from Xcode.
2. Keep the Mac awake on the TV's network and run `npm run bridge:hls` on it.
3. On the Mac, open http://localhost:8787, paste a fresh original **master** URL,
   choose the Mac's network address, and select **Prepare playlist**.
4. Copy the generated `http://<Mac-address>:8787/hls/…/….m3u8` URL to the iPad
   app's media URL field (Universal Clipboard or another private transfer).
   Do not use localhost, the original unsigned child URL, or a redacted report URL.
5. Select **Use Mac bridge HLS settings**, connect to the TV, and **Load & play**.
   The button preserves the URL, sets HLS MIME and both fMP4 formats, start 0,
   and live off. The iPad does not prepare playlists or automatically copy tokens.
6. Confirm the correct video **and audio**, Pause/Play/Seek/Stop, and receiver
   observations. Keep the Mac bridge running. Its sessions expire after 30 minutes;
   upstream authorization may expire earlier. Do not share the generated secret URL.

This is a native iPad sender with a Mac playlist host; it does not establish a
Mac-free or Safari-only flow. Subtitles remain deferred.

After the public preset works, enter a legitimate original direct-media URL and
its MIME. The diagnostic report's `[REDACTED]` links cannot be played; this app
rejects them. A `.json` extension does not itself establish JSON versus HLS
content, and an HTML source MIME attribute is not verified response content.

For a source genuinely serving HLS, use `application/vnd.apple.mpegurl`. Keep the
Live toggle off unless the stream is known to be live. The TV fetches the URL
independently; no Safari cookies, custom authorization headers, or DRM keys are
transferred. Signed links may expire or fail on the receiver. Generic failure
codes are not treated as proof of DRM or authentication requirements.

Inputs live in the current UI session and are not persisted by application code.
Application diagnostics omit media URLs and title text; the device name and
numeric Cast error/idle codes may appear locally. Do not commit private links
or unreviewed SDK/device console logs. No remote logging backend is configured.

## Architecture

- `NativeCastApp.swift`: SwiftUI form, official SDK Cast button, and early SDK initialization.
- `CastService.swift`: main-actor session/media listener and request tracking. It
  separates requests from receiver playback state, times out request tracking,
  resets status when inactive/disconnected, and refreshes on foreground/resume.
- `MediaInput.swift`: direct URL, MIME, start-position validation shared with the
  offline native tests. Semantics follow the existing TypeScript core, without
  bundling a JavaScript runtime.
- `Info.plist`: local-network description and `_googlecast._tcp` /
  `_CC1AD845._googlecast._tcp` discovery entries.
- `Package.resolved`: exact Google Cast 4.8.6 and GTMSessionFetcher 3.5.0 resolution.

SDK listeners are used on the main actor; Objective-C protocol conformances use
`@preconcurrency` for the imported SDK. No background execution capability is
requested. Losing native-app control when suspended is a physical test question,
not a promised Safari/background feature.

## Verification

Unsigned generic-iOS build:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project spikes/ipad-cast/iPadCastTest.xcodeproj -scheme iPadCastTest \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/uvc-ipad-cast-build CODE_SIGNING_ALLOWED=NO build
```

Offline input tests (Mac; no device or Cast library needed):

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swift test \
  --package-path spikes/ipad-cast --scratch-path /tmp/uvc-ipad-input-tests
```

Initial unsigned build and six native validation tests pass. Tests cover signed
query preservation, credential/nontransferable URL rejection, redacted links,
invalid positions/MIME, and private input error redaction. These do not establish
physical receiver compatibility or UI/control correctness. Record real results
in [the validation sheet](../../docs/IPAD_NATIVE_CAST_RESULTS.md).

## Official sources and distribution notes

- [Google iOS setup](https://developers.google.com/cast/docs/ios_sender)
- [Google iOS integration](https://developers.google.com/cast/docs/ios_sender/integrate)
- [Pinned SDK package manifest](https://github.com/googlecast/google-cast-ios-sdk/blob/4.8.6/Package.swift)
- [SDK terms](https://developers.google.com/cast/docs/terms/)

SDK binaries/dependency checkouts stay in Xcode's package/build directories, not
Git. Upstream SDK terms, licenses, resources, and app distribution requirements
still apply. This development test app is not claimed ready for App Store release.
