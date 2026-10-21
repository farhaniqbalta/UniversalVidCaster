# Safari feasibility probe

## Part 1 diagnostics implemented — 2026-10-21

The popup is now **Video diagnostics**, version 0.0.2. It collects page video
observations and generates a redacted report before data crosses to the popup.
Use **Inspect / Refresh page**, review the JSON, then **Copy redacted report**.
Native messaging is optional and independent. Casting is not implemented.

Follow [the iPad diagnostic guide](../../docs/SAFARI_DIAGNOSTICS.md); physical
installation and actual-site validation are pending. Run
`npm run build:safari-probe` and rebuild/reinstall the existing iOS target to get
the new resources. The macOS target shares the updated resources.


## Priority update — 2026-10-21

The main target is M1 iPad Pro, reported iPadOS 27.0.1. The
[new two-part plan](../../docs/IPAD_DIAGNOSTICS_AND_NATIVE_APP_PLAN.md) supersedes the earlier
desktop-first work order: Safari diagnostics first, iPad native Cast test app
second. Mac/Python bridge integration is paused. Earlier results remain valid
within their tested platform. End-to-end casting while staying in Safari is
still unproven. This update is planning only; Part 1 software is now implemented; Part 2 and physical iPad/site validation
remain pending.


This contains macOS and iOS Safari Web Extension test targets with Apple's required packaging hosts.
It is not a standalone Cast sender app. **Casting is not implemented.** The
containing host only provides Apple's generated extension setup screen.

## Next step: desktop Cast transport experiment

Inspection and native messaging have passed in desktop Safari. Casting remains
unimplemented. A [third-party source review](../../docs/THIRD_PARTY_CAST_REVIEW.md)
recommends an isolated PyChromecast experiment before designing any Safari bridge
integration. The user authorized isolated installation and selected the Cast TV.
The [initial experiment](transport-experiment/README.md) reached receiver-reported
playback and controls; the user confirmed visible TV playback. One SSL warning
remains unresolved. Nothing is integrated into Safari. iPhone work remains deferred. The finished flow must keep controls in
Safari and use the TV's existing Google Cast receiver without TV installation.

## Current test: desktop Safari on macOS

The current priority is desktop Safari. iPhone testing is deferred until the last
platform check. Both targets share the same generated JavaScript resources.
Neither target implements casting, and the iOS SDK probe is not macOS SDK evidence.

1. From the repository root, run `npm run build:safari-probe`.
2. Open `xcode-macos/UniversalVidCaster Safari Probe/UniversalVidCaster Safari Probe.xcodeproj`.
3. Select **UniversalVidCaster Safari Probe → My Mac**, then Build and Run. The
   generated host exists only to package/register the Safari extension.
4. For unsigned development, enable Safari's web developer features in Settings
   → Advanced, then **Allow unsigned extensions** in its Developer settings (or
   Develop menu, depending on Safari version). This setting may reset after restart.
5. Enable the probe under Safari Settings → Extensions.
6. Open `http://localhost:5173/` in Safari with the existing harness running.
7. Open the extension popup, allow access to this page, and select **Inspect this
   page**. Expect the flower MP4 candidate with a MIME hint.
8. Select **Check native bridge**. Expect `nativeMessaging: true` and
   `castImplemented: false`. Close/reopen the popup and repeat both checks.

Record errors and Safari/macOS versions. A passing probe establishes DOM/native
messaging only. No Cast device chooser or playback controls are implemented here.
See [Apple's unsigned extension testing instructions](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension).

Unsigned command-line build from the repository root:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project 'spikes/safari-google-cast/xcode-macos/UniversalVidCaster Safari Probe/UniversalVidCaster Safari Probe.xcodeproj' \
  -scheme 'UniversalVidCaster Safari Probe' -sdk macosx \
  -destination 'platform=macOS' -derivedDataPath /tmp/uvc-safari-macos-build \
  CODE_SIGNING_ALLOWED=NO build
```

## Verified on 2026-10-19

- Official Google Cast SDK 4.8.6 dynamic archive downloaded outside the repository.
- SHA-256: `55f6c21291a1315c68063f07e7d76225564bff70f2fd38caad135c71d66eb310`, matching Google's package manifest.
- Device framework has `APP_EXTENSION_SAFE` in its Mach-O header.
- `ExtensionApiProbe.swift` passes `swiftc -typecheck -application-extension` for
  arm64 iOS 16 using Xcode 27.1. It checks context and discovery API imports only.
- Extension JavaScript builds and TypeScript checks pass.

The flag and type-check do not prove runtime discovery, session lifetime, Google
support for Safari extensions, or App Store acceptance. No native Cast SDK is
linked into the Safari test project yet. No SDK binary is committed.

Official sources: [Google package manifest](https://github.com/googlecast/google-cast-ios-sdk/blob/main/Package.swift),
[iOS integration](https://developers.google.com/cast/docs/ios_sender/integrate),
[Safari native messaging](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension).

## Build the Safari test resources

From the repository root with dependencies installed:

```sh
npm run build:safari-probe
```

This generates ignored `spikes/safari-google-cast/dist/`. The checked-in Xcode
project references those resources, so build them before opening/building it.

Open `xcode/UniversalVidCaster Probe/UniversalVidCaster Probe.xcodeproj` in Xcode.
The test targets require iOS 17 or later. Select your own signing team and unique
bundle identifiers for both the host and extension, then select a connected iPhone
and run. Do not commit personal signing configuration or Xcode user state.

For an unsigned compile-only device build from the repository root:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project 'spikes/safari-google-cast/xcode/UniversalVidCaster Probe/UniversalVidCaster Probe.xcodeproj' \
  -scheme 'UniversalVidCaster Probe' -sdk iphoneos \
  -destination 'generic/platform=iOS' -derivedDataPath /tmp/uvc-safari-probe-build \
  CODE_SIGNING_ALLOWED=NO build
```

Unsigned output cannot be installed directly on an iPhone.

## Physical Safari checks — not yet performed

1. Enable the probe in Safari's extension settings on the iPhone.
2. Open a page containing an accessible video element, such as the existing local
   harness if reachable securely from the phone. Mac localhost is not phone localhost.
3. Open the extension and tap **Inspect this page**; grant website access when
   prompted. Check the media URL and MIME hints. Restricted pages may refuse injection.
4. Tap **Check native bridge**. Expect a response with `nativeMessaging: true` and
   `castImplemented: false`. This proves only extension request/reply transport.
5. Close and reopen the popup, inspect again, and test a page without videos.
6. Record iPhone/iOS, permissions, source page, errors, and actual responses.

The extension uses `activeTab`, `scripting`, and `nativeMessaging`; no broad host
permission, network interception, cookies, or TV IP input is used. Inspection
injects bundled code into the main frame only in the extension's isolated world.
Candidates appear only in the popup and are not sent to the native handler.

## Repeat the SDK compile probe

Obtain and verify the official 4.8.6 dynamic archive using Google's package
manifest, extract outside the repository, then run:

```sh
python3 spikes/safari-google-cast/check_extension_api.py /path/to/extracted/sdk
```

Do not initialize discovery in the handler until runtime permissions, lifecycle,
SDK distribution terms, and a supported Safari-hosted control design are assessed.
No app handoff is implemented. A real-device discovery/session test remains the
next Cast feasibility gate after Safari request/reply works.

Unsigned generic-iOS Xcode build passes with Xcode 27.1 after correcting the
generated host/extension bundle ID prefix. This is a compile/package check, not
a signed installation or physical iPhone run.

Desktop verification: Safari resource build and unsigned macOS Xcode build both
passed on 2026-10-19. User subsequently confirmed Safari DOM inspection and native round-trip: flower
MP4 with `video/mp4`, and `nativeMessaging: true` / `castImplemented: false`.
Actual Cast transport remains unimplemented.
