# M2 implementation checklist — Safari feasibility first

## Latest priority update — 2026-10-21

- [ ] Complete the Mac HLS bridge aging test; record duration, stalls, seek behavior, and expiry/recovery results.
- [ ] Continue physical native iPad Cast validation after the Mac baseline check.
- [ ] **Deferred:** external WebVTT subtitle loading, selection, display, and synchronization validation.
- [ ] **Deferred:** subtitle URL detection/copying enhancements in the Safari extension.

Subtitle work is parked at the user's request and does not block video/audio
reliability or iPad testing. Earlier discussions of subtitle implementation do
not establish physical subtitle support. The video MIME-copy enhancement can be
revisited independently; it is not required for the bridge's automatic HLS settings.

Current focus (2026-10-21): user prioritized the site's HLS playback before
iPad testing. The Chrome harness has a bounded child-access diagnostic and
explicit fMP4 format hints. The Mac manifest bridge is implemented with six
additional rewrite tests (64 existing tests also pass). The user confirmed the
correct video, audio, and Pause/Play/Seek worked in the TV test. Full-duration,
expiry/recovery, and iPad validation remain pending. See [HLS site test](HLS_SITE_TEST.md).

Earlier site diagnostic update (superseded by bridge result above): desktop analysis is recorded in
[SITE_MEDIA_DIAGNOSTIC_FINDINGS.md](SITE_MEDIA_DIAGNOSTIC_FINDINGS.md). The bare
initialization-resource request returned 401; the current direct-URL Cast path
does not work for this site. No token values or full media URLs are retained.
The website can be closed; continue native iPad testing with the flower baseline.


Latest Part 2 update (2026-10-21): a dedicated native iPad Cast test app is
implemented under `spikes/ipad-cast`, pinned to official Cast SDK 4.8.6. Unsigned
build and six input tests pass. Signing/install and receiver playback remain
pending. This supersedes earlier Part 2 not-started statements below. See the
[native app guide](../spikes/ipad-cast/README.md).

Part 1 update (2026-10-21): Safari diagnostics software is implemented with 53
passing tests, type checks, web/Safari builds, and unsigned iPadOS/macOS packaging
builds. Physical iPad/site checks are pending; Part 2 native app software is now
implemented with physical validation pending. See [diagnostic guide](SAFARI_DIAGNOSTICS.md) and
[results sheet](IPAD_DIAGNOSTIC_RESULTS.md). This supersedes earlier plan-only
status below.

## Priority update — 2026-10-21

The main target is M1 iPad Pro, reported iPadOS 27.0.1. The
[new two-part plan](IPAD_DIAGNOSTICS_AND_NATIVE_APP_PLAN.md) supersedes the earlier
desktop-first work order: Safari diagnostics first, iPad native Cast test app
second. Mac/Python bridge integration is paused. Earlier results remain valid
within their tested platform. End-to-end casting while staying in Safari is
still unproven. This update is planning only; no new app or diagnostic code has
been implemented under this plan yet.


Update 2026-10-21: experimental command worker and
[session-ownership design](SAFARI_CAST_BRIDGE_DESIGN.md) are implemented/documented.
12 offline Python tests and a diagnostic subprocess smoke test pass. Swift process
launch, signed runtime packaging, and end-to-end Safari casting remain pending.

- [x] Define serial command IPC, worker-owned sessions, fresh receiver snapshots, and process-loss behavior.
- [x] Implement/test the standalone command worker without exposing an HTTP service.
- [ ] Validate bundled Python and dependency execution inside the sandboxed macOS native target.
- [ ] Implement bounded Swift request/reply process management and worker restart handling.
- [ ] Wire the experimental native adapter and Safari controls through shared core contracts.
- [ ] Prove Safari-to-TV playback and popup/native-process lifecycle behavior on the real device.

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
- [x] Investigate current official macOS Safari sender options: no supported transport identified; inspected 4.8.6 archive has iOS-only variants.
- [ ] Resolve the desktop transport blocker with supported integration evidence or an explicitly approved architecture change.
- [ ] Prove discovery, connection, load, controls, and live receiver status while remaining in Safari.
- [ ] Perform iPhone compatibility and physical checks last.

Desktop setup: [probe README](../spikes/safari-google-cast/README.md).

## Isolated desktop transport experiment — initial run performed

- [x] Review third-party library metadata, runtime requirements, dependencies, and selected connection source.
- [x] Report findings before importing or installing anything.
- [x] Document the proposed Safari/extension/native flow and the experiment boundary.
- [x] Obtain go-ahead and install PyChromecast 14.0.10 in a temporary environment outside the repository.
- [x] Set up temporary Python 3.12.15 and record resolved dependencies.
- [x] Discover a real Cast device, obtain user target selection, and send the flower MP4 without TV-side installation.
- [x] Record receiver playback/control states and user-confirmed visible TV playback (2026-10-19).
- [x] Investigate and run three fresh-status control cycles: all passed with zero warnings.
- [ ] Establish the original SSL warning's cause or an explicit experimental acceptance boundary; no fix has been proven.
- [ ] Decide whether the experimental transport merits a Safari/native bridge integration design.

See [third-party review](THIRD_PARTY_CAST_REVIEW.md) and the
[experiment results](../spikes/safari-google-cast/transport-experiment/README.md).
The library is installed only in a temporary test environment. Safari integration
is not implemented, and the SSL write warning remains unresolved.

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

Desktop transport assessment is recorded in [feasibility findings](M2_SAFARI_FEASIBILITY.md). M2 remains incomplete; no discovery/playback implementation can yet be claimed under the current supported-integration requirement.

Reliability follow-up (2026-10-19): three cycles passed with fresh receiver status
and zero warnings; three offline freshness tests pass. The initial SSL warning
was not reproduced and remains unexplained. See the experiment README and
sanitized reliability results. Safari session ownership remains a separate gate.
