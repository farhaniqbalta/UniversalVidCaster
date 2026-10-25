# iPad Safari to native app: explicit bundled transfer

UI update (2026-10-23): popup 0.0.5 uses **Find video / Refresh** and **Copy transfer
for iPad**, with Diagnostics collapsed and subtitle capture help in its own section.
The transfer schema and native Paste action are unchanged. See [UI research and redesign](SAFARI_EXTENSION_UX.md).

Popup width fix (2026-10-23): user confirmed the wider popup works in iPad Safari.
The stylesheet requests an 800px preferred width without clamping it to the
initial narrow popup viewport. Safari controls the final outer size. Narrow
Safari windows and iPhone layouts remain separate validation items.

Implemented 2026-10-23. User-confirmed physical transfer and video/audio/subtitle
playback pass on 2026-10-23. Existing playback architecture
is retained; inputs are imported into WorkspaceSession rather than triggering
SDK calls from the extension. This is an explicit clipboard handoff, not automatic
app launching, persistent shared storage, or a Safari-hosted Cast sender.

## Open in app — implementation update (2026-10-25)

Extension 0.0.6 adds **Open in Universal VidCaster** as the primary action after
Find video/Refresh and selection. It requests opening the native app with the
selected video/method/subtitle already filled. The app still requires review,
TV selection if needed, and an explicit Cast action. It never auto-loads, stops
TV media, or clears the current host on import. This supersedes the earlier
clipboard-only description above; Copy transfer/Paste remains the fallback.

Normal inspection already collects exposed track URLs and associated subtitle
resource entries. One associated subtitle with a known valid language is now
preselected; multiple/unknown-language results remain manual choices. Choose
No subtitle to omit it. If none is available, expand the watch help and use the
existing off/on workflow. No automatic request interception or player internals
were added, and absent results are never guessed.

The explicit click builds `universalvidcaster://import#<encoded-transfer>` and
requests synchronous navigation inside the user gesture. The native app
registers that scheme and validates route, size, schema, original URLs, method,
and language before changing the draft. Invalid/busy imports preserve it.
Safari may ask for confirmation or refuse the transition; opening requested is
not proof of import success. Canceling does not trigger clipboard reads or playback.

Privacy change: this optional route carries original signed URLs in an encoded
URL fragment passed to the OS. Encoding is not encryption. The extension does
not place it in an anchor, report, webpage, logs, storage, or a server request,
but OS URL handling is outside the app's control and custom schemes are not
exclusive ownership/authenticated channels. Do not share these links. The
clipboard path is still available; no App Group/signing entitlement is required.
A future stronger handoff could pass an opaque ID through a shared native store.

Implementation references: [Apple custom URL schemes](https://developer.apple.com/documentation/Xcode/defining-a-custom-url-scheme-for-your-app).
Physical result (2026-10-25): the user confirmed the update works on the iPad.
Record the Safari **Open in Universal VidCaster** transition and native setup
import as a user-reported pass. Individual cold/warm launch, cancellation, busy
session, and subtitle fallback cases were not separately reported; retain the
checklist below for broader regression coverage.

Automated verification: 88 web tests and 33 native tests pass, along with
TypeScript checks, shared extension resources, plist validation, and the unsigned
iPad app/embedded-extension build. The subsequent user-reported physical pass
is recorded above, separately from these automated checks.

### Physical check for this update

1. Rebuild shared extension resources and Run the iPad app from Xcode to install
   both the app URL registration and extension 0.0.6.
2. Start a website video with captions. Find video; check the single associated
   subtitle and language are offered without starting a watch. If missing, use
   the fallback. Confirm multiple choices are not silently guessed.
3. Choose method and tap Open in Universal VidCaster. Accept Safari's prompt if
   shown. Confirm setup imports without Paste, preserving original authorization.
4. Review and cast. Confirm video/audio/subtitles. Repeat when the app is closed
   and already open, and while a previous video is playing (import must not stop it).
5. Cancel opening, then confirm Copy transfer/Paste still works. Test refresh and
   No subtitle so old captions are not retained. Unsupported/oversized links must
   not replace the existing draft.


## Install/update

1. Run `npm run build:safari-probe` from the repo root. This generates the shared
   extension resources used by the Mac probe and iPad app; generated files stay ignored.
2. Open `spikes/ipad-cast/iPadCastTest.xcodeproj`. The existing iPadCastTest scheme
   now builds and embeds a **VidCasterSafari** extension target as well.
3. For signed installation, select the same development Team for the app and the
   new extension target. If the app uses a custom bundle identifier, set the
   extension target's `UVC_CONTAINER_BUNDLE_ID` to that app identifier so its
   `.safari` bundle ID remains prefixed by the containing app's ID. No App Group
   entitlement or Google Cast SDK in the extension is needed.
4. Build/run on the iPad. Enable the app's extension in Safari's extension settings
   and allow it on the test website. If an older probe extension is installed,
   disable that old one to avoid opening outdated popup code. Current shared
   extension manifest version is 0.0.6.

## Use

1. In **iPad Safari**, open/start the target video. Open the extension and select
   **Find video** (or **Refresh** after inspection).
2. If captions are wanted but missing, use **Watch new subtitle requests**, close
   the popup, toggle subtitles off/on in the player, then reopen and inspect.
3. In the transfer card, choose the video, playback method, and optional
   subtitle. Confirm its language (`en` or `id`, or another supported tag).
   Use **Prepare on iPad** for the observed signed HLS master URLs; use Direct
   for public MP4. The method is chosen explicitly, not inferred from `.json`.
4. Select **Copy transfer for iPad**. Original signed URLs are copied
   together. A clipboard failure exposes a selected manual-copy fallback; hide
   and clear it before sharing screenshots. This payload is private, unlike the
   separately redacted diagnostic report.
5. Open **Universal VidCaster** manually. In **Paste Safari transfer**, tap the
   system Paste control. Review the filled video, method, subtitle, and language.
6. Connect to the TV and cast normally. The import does not prepare, play, stop,
   disconnect, or replace a currently-playing video. Existing confirmation and
   validation apply when the user explicitly casts/replaces it.

A transfer without a subtitle replaces the input draft with subtitles off and an
empty subtitle URL, preventing carry-over from the previously imported video.
Invalid/unsupported transfers preserve the previous draft and show a generic
error without echoing private data. A single raw URL still belongs in the normal
media URL field's Paste control; it is not a bundled Safari transfer.

## Contract and privacy

The extension produces a JSON string with this versioned shape:

```json
{
  "type": "universal-vidcaster.handoff",
  "version": 1,
  "video": {
    "url": "https://media.example.test/master.json?t=EXAMPLE&pm=browser",
    "mimeType": "application/vnd.apple.mpegurl",
    "method": "prepare-on-ipad",
    "startSeconds": 0
  },
  "subtitle": {
    "url": "https://subtitles.example.test/en.vtt?t=OTHER",
    "language": "en"
  }
}
```

`mimeType` and `subtitle` may be omitted. Version, type, method, URL/credentials,
redaction placeholders, language, finite start time, size, and mode-specific
requirements are validated before the draft changes. Subtitle authorization
remains independent. These example domains and values are not playable links.

For the clipboard fallback, no original payload is appended to the redacted
diagnostic export, logged, sent through native messaging, or persisted in
extension storage. The optional Open route uses an app link as described above.
It lives in popup memory and the clipboard the user explicitly writes, then the
app's in-memory draft. OS clipboard behavior is outside app persistence; replacing
the clipboard contents removes that copy. No passive clipboard reading is added.

Inspection still has main-document/resource-observation limits and provider-specific
subtitle association. It does not discover every site's media or prove that a
particular subtitle matches dialogue. No URL fetch, token renewal, cookie transfer,
or playback command occurs on import. Native foreground hosting remains required
for Prepare on iPad mode.

## Verification and remaining gates

Physical result (2026-10-23): the user confirmed Paste works, then confirmed
“video sound subtitle all working” after being instructed to prepare/cast the
imported form with Mac bridge stopped. Record this as a user-reported pass for
the explicit iPad Safari -> clipboard -> native app -> TV flow. No new seek,
subtitle-timing precision, endurance, token-expiry, or network-loss measurements
were supplied in this final confirmation. Foreground native operation remains
the accepted requirement; automatic app launch is not implemented.

- 83 web tests, TypeScript checks, and extension resource build pass.
- 29 native tests pass, including independent subtitle authorization, rejected
  versions/oversized payloads, atomic import, clearing old subtitle input, and no
  playback/host side effects on import.
- Unsigned iOS build includes the VidCasterSafari extension bundle. The user's
  subsequent physical result above establishes the tested transfer/playback flow;
  permission denial/recovery and broader website compatibility remain untested.
