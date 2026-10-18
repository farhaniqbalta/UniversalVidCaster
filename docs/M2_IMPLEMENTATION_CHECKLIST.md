# M2 implementation checklist — Safari feasibility first

Status (2026-10-19): desktop Safari DOM inspection and native request/reply passed per user report. macOS and iOS unsigned builds pass; the selected iOS Cast APIs pass extension-restricted type checking. Safari Cast transport remains unimplemented/unproven. iPhone runtime validation is deferred until the final platform check.

User decision (2026-10-18): a containing-app handoff is acceptable only for
feasibility testing. The finished product must keep Cast device selection and
controls in Safari. A native-only or handoff-based test cannot satisfy release
acceptance.
Latest direction (2026-10-19): prioritize Safari extension investigation. Do not
build a standalone iPhone app or native sender spike now. Any required extension
packaging host is infrastructure only, not an app-first product.

See [findings and official sources](M2_SAFARI_FEASIBILITY.md).

## Current priority — desktop Safari first (2026-10-19)

The user's latest direction supersedes the iPhone-first work order below. Test
Safari on macOS now. Keep iPhone-specific tasks for the final platform check.
Do not treat macOS Safari success as iOS validation, or the iOS Cast SDK as a
macOS transport.

- [x] Generate a macOS Safari Web Extension probe using the existing inspection and native-messaging resources.
- [x] Add a native diagnostic response that explicitly reports Cast as unimplemented.
- [x] Verify the unsigned macOS Xcode build (Xcode 27.1, 2026-10-19).
- [x] Run the packaging host and enable the extension in desktop Safari (user-reported working popup).
- [x] Confirm page inspection and native request/reply in desktop Safari (user supplied flower MP4 candidate and native response).
- [ ] Investigate a supported macOS Safari Cast sender path independently of the iOS SDK.
- [ ] Prove discovery, connection, load, controls, and live receiver status while remaining in Safari.
- [ ] Perform iPhone compatibility and physical checks last.

Desktop setup: [probe README](../spikes/safari-google-cast/README.md).

## 1. Establish architecture and prerequisites

- [x] Review Google Web/iOS sender and Apple Safari native messaging documentation.
- [x] Identify native handler versus containing-app process boundaries and iOS push limitations.
- [x] Verify installed Xcode: 27.1 (27A9275); Safari extension converter is available.
- [x] Record UX decision: app handoff allowed for tests only; final device selection and controls must stay in Safari.
- [x] Install full Xcode; commands verified with per-command `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`. Global selection still points to Command Line Tools.
- [ ] Record iPhone model/iOS, Xcode version, signing setup, Cast device, and network.
- [ ] Verify current Cast SDK installation, deployment target, license, and extension-safety requirements from official sources before selecting/pinning its version.

## 2. Investigate and prove the Safari extension path

- [ ] Establish supported sender API/SDK extension-safety and lifecycle constraints before claiming in-Safari Cast is feasible.
- [x] Create the smallest Safari Web Extension test target with activeTab, scripting, nativeMessaging, and only the packaging host required by Apple.
- [x] Reuse the shared detector for user-triggered main-frame page inspection.
- [ ] Add validated manual media input when a supported sender path is established.
- [ ] Verify content-script relay through extension UI/background to the native handler using request/reply.
- [ ] Validate any App Group payload transfer with expiry, validation, and consumed-request handling.
- [ ] Keep app-launch/handoff work deferred; test the Safari-hosted flow first.
- [ ] Demonstrate candidate selection in Safari leading to a native Cast session and TV playback.
- [ ] Test return-to-Safari controls and fresh status, including app suspension and extension popup closure.
- [ ] Prove device selection, connection, loading, controls, and fresh status remain in Safari in the proposed release flow; native test handoff is insufficient.
- [ ] If this Safari flow cannot be achieved, report the blocker before proposing a change to the product requirements.

## 3. Integrate only after the feasibility gate passes

- [ ] Design a Safari-compatible sender adapter around the proven native boundary; preserve controller ownership and receiver-confirmed state.
- [ ] Integrate the extension UI with shared core and detector; do not reuse the Chrome adapter as an iOS transport.
- [ ] Add bridge validation/lifecycle tests and run the existing TypeScript suite/build.
- [ ] Run complete physical-iPhone acceptance, document limitations, and assess distribution requirements.

## Deferred: native sender app spike

- [ ] Create a minimal sender-side iOS spike in `spikes/safari-google-cast/`, using the official Cast iOS SDK.
- [ ] Configure Default Media Receiver, SDK Cast UI, local-network description, and required Bonjour entries.
- [ ] Build and run on physical iPhone; record permissions and SDK/device details.
- [ ] Cast the MDN flower MP4 without TV-side installation; confirm receiver state and visible TV playback separately.
- [ ] Test play, pause, seek, stop, disconnect, permission denial, and recovery.
- [ ] Test app background/foreground and session resumption; record actual behavior.

These tasks are deferred by the user’s 2026-10-19 direction. Do not start them
without renewed authorization. Native-only success would not prove the Safari product.

## Artifacts

Created now:

- `docs/M2_SAFARI_FEASIBILITY.md`
- `docs/M2_IMPLEMENTATION_CHECKLIST.md`

Conditional, after prerequisites and UX decision:

- `spikes/safari-google-cast/`: Safari feasibility test notes and any minimal extension bridge proof; standalone native sender work is deferred.
- `apps/safari-extension/`: production extension only after the sender path is proven.
- A platform adapter package and tests, shaped by the validated bridge contract.

Do not add a TV receiver, proprietary LAN API, backend, webpage casting, or
mirroring. Do not mark M2 complete on native-only or desktop Chrome success.

## Compile and packaging evidence — 2026-10-19

- Official Google Cast 4.8.6 dynamic archive checksum matches its package manifest.
- Device framework has `APP_EXTENSION_SAFE`; context/discovery API probe passes
  Swift type checking with `-application-extension`. This is not runtime proof.
- `spikes/safari-google-cast/` now contains the compile probe, minimal Safari popup,
  detector injection, native request/reply handler, and generated Xcode test project.
- Native replies explicitly report `castImplemented: false`. No app handoff,
  device discovery, media load, or fake successful Cast status is implemented.
- TypeScript checks, all 40 existing tests, web harness build, and Safari JavaScript
  build pass. CI now builds the Safari resources too.
- Physical instructions and evidence are in the [probe README](../spikes/safari-google-cast/README.md).
- Next physical gate: install/sign the extension, confirm page inspection and
  native request/reply, then investigate SDK runtime discovery in that process.

Unsigned generic-iOS Xcode build passes with Xcode 27.1 after correcting the
generated host/extension bundle ID prefix. This is a compile/package check, not
a signed installation or physical iPhone run.

## Desktop Safari runtime result — 2026-10-19

User supplied the probe output from Safari:

- Candidate: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4`
- MIME: `video/mp4`
- Native response: `{"castImplemented":false,"version":1,"nativeMessaging":true}`
- Detector limitations were displayed.

Result: DOM inspection and native request/reply pass in the user's desktop Safari
setup. Safari/macOS versions were not supplied. Discovery, connection, load,
playback controls, and live Cast receiver status remain unimplemented/unproven.
Next: investigate a supported macOS Safari Cast sender transport without changing
the no-TV-install or in-Safari interaction requirements.
