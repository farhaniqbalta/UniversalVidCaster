# Native iPad Cast test app

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
