# Plan: Safari diagnostics, then an iPad native Cast app

Date: 2026-10-21. Status: Part 1 software implemented (2026-10-21), physical iPad/target-site validation pending. Part 2 software implemented; physical native-iPad validation pending. See [diagnostic run guide](SAFARI_DIAGNOSTICS.md).
Target hardware: user's M1 iPad Pro, reported iPadOS 27.0.1.

This plan supersedes the earlier desktop-first M2 work order. Pause macOS/Python
bridge integration. Retain existing probes and results as supporting evidence.

## Goals and boundaries

1. Understand what the actual website exposes to a permitted Safari extension.
2. Test compatible direct media with Google's official iOS Cast SDK on the iPad.
3. Evaluate a connection between those components only after each works.

The desired final interaction remains in Safari. Building a native app for
testing does not establish that its Cast session can operate behind Safari.
No project-specific TV app, manual TV IP, backend, cookie/header extraction,
DRM bypass, screen mirroring, or transcoding is included.

## Part 1 — Safari diagnostic extension

### Design

```text
User opens video in iPad Safari
  -> opens extension and grants page access
  -> selects Inspect
  -> shared TypeScript diagnostics inspect permitted DOM
  -> extension displays observations, candidates, and limitations
  -> user optionally previews and copies a redacted JSON report
```

Reuse the existing Safari extension packaging targets and detector. The containing
app initially only packages the extension; native messaging and Cast are not
required to run diagnostics. Keep diagnostics in a reusable TypeScript package.

### Checklist

- [x] Define a versioned `PageMediaDiagnosticReport` with collection time, inspected frame scope, observations, candidate provenance, and limitations.
- [x] Collect accessible video `currentSrc`, `src`, source URLs/types, duration, current time, dimensions, paused/ended state, ready/network state, and media error code.
- [x] Normalize non-finite media numbers to `null` for JSON; do not describe Infinity duration as proof of live media.
- [x] Record source schemes, including excluded blob/data/mediastream sources, so missing candidates have an explanation.
- [x] Describe blob as nontransferable; distinguish direct observations from possible MSE use. A blob URL alone does not prove MSE.
- [x] Report observable attached `mediaKeys`; absence is not proof that content is unprotected. Do not attempt to read keys, licenses, or credentials.
- [x] Report frame boundaries and access failures. Inspect the main permitted document first; do not request broad site access or imply all embedded players were inspected.
- [x] Show available MIME attributes separately from extension-based hints. Neither establishes the encoded codecs or receiver support.
- [x] Add Inspect/Refresh, candidate details, readable explanations, and report preview/copy actions to the popup.
- [x] Redact query values, fragments, and embedded credentials in page, frame, candidate, and source URLs before export. Avoid exporting raw exception messages containing URLs.
- [x] Keep exact media URLs transient for local inspection/future explicit use; do not write them to console logs or persistent storage by default.
- [x] Explain that redacted reports cannot be used directly for playback, and that paths, hostnames, and page metadata may still contain identifying information. Let the user review before copying.
- [x] Provide a selectable report field as a fallback if Safari denies clipboard access.
- [x] Add meaningful tests for direct MP4/HLS/DASH hints, missing MIME, duplicate/relative URLs, blob, invalid URLs, media keys, non-finite values, frames, and redaction of every URL field.
- [x] Run TypeScript tests/checks and Safari resource/web harness builds.
- [x] Verify updated native iPadOS and macOS packaging builds (unsigned generic targets).
- [ ] Sign/install the extension on the iPad; record signing and website permissions separately from detection failures.
- [ ] Test the known flower MP4 page, an empty page, and the user's actual website before and after starting its video. Verify refreshing captures dynamically changed source state.

### Results and acceptance

The output should answer: What was visible? Which possible direct URLs exist?
What metadata is known? What prevented further inspection? What remains unknown?

Use descriptions such as “Direct media candidate found”, “Blob source observed”,
and “Embedded frame not inspected”. No automatic SUPPORTED/DRM-free assertion.
Receiver reachability, cookies, signed-link expiry, codecs, and actual playback
remain unknown unless independently validated.

Part 1 passes when diagnostics and redacted export work on the iPad and the
actual website's observations/limitations are recorded. Finding no direct URL is
a valid diagnostic result, not a failure to be worked around with extraction.

## Part 2 — iPad native Cast test app

### Design

```text
User opens the native test app
  -> enters/selects a direct media URL and MIME
  -> official iOS Cast SDK discovers and selects existing Cast device
  -> Default Media Receiver loads the URL
  -> TV fetches media directly
  -> app observes receiver state and offers playback controls
```

Use Swift with Google's official iOS Cast SDK. Do not port or bundle the macOS
Python experiment into iPadOS. Begin with manual input, independent of the
extension, to isolate SDK/media compatibility from Safari permissions.

### Checklist

- [x] Inspect the existing iOS packaging project and choose a dedicated iPad test target/scheme, preserving diagnostic extension behavior.
- [x] Verify and pin the official SDK version, deployment requirements, licenses/resources, and supported dependency setup before integration.
- [x] Configure Default Media Receiver, local-network usage description, required Bonjour services, and native SDK discovery UI.
- [x] Add public flower MP4 preset plus manual HTTP(S) URL, MIME, title, and start position input. Validate without importing Safari cookies or private headers.
- [x] Implement discovery/selection, connection, load, play, pause, seek, stop, disconnect, and receiver status/error display in Swift.
- [x] Separate connection success, accepted load, and receiver-reported PLAYING. Use a visual TV check as separate evidence.
- [x] Keep native SDK/session code separate from the app UI; reuse TypeScript media semantics where practical without forcing a Dart/Python/JavaScript runtime into the app.
- [ ] Test flower playback and controls on the physical iPad and Cast TV with zero TV-side installation.
- [ ] Test permission denial/recovery, unreachable media, background/foreground transitions, and reconnection; describe observed failures without guessing DRM/authentication causes.
- [ ] If Part 1 exposes a legitimate direct URL on the target site, test that exact unredacted URL through explicit user input. Do not reconstruct redacted URLs or persist signed URLs in test logs.
- [ ] Record device/iPadOS, SDK/Xcode versions, receiver, format, results, and limitations without committing personal provisioning or private links.

Part 2 passes when the native app reliably casts the public test video and reports
actual receiver state on this iPad/TV. Target-site playback is assessed separately;
native app success does not prove Safari-hosted casting or universal site support.

## Later integration gate — separate from Parts 1 and 2

Investigate whether the official SDK can own a session from a Safari extension
native context, including device selection, network permissions, handler lifetime,
popup closure, fresh status, and reconnection. A normal native app's lifecycle is
different. Shared storage or native messaging does not keep the app running.

If a foreground native app is necessary, report that product limitation before
changing the final stay-in-Safari requirement. Do not promise invisible background
casting or silently replace Safari controls with native-app controls.

## Planned files and changes

| Area | Planned files / changes |
| --- | --- |
| Diagnostic models and collection | `packages/detector/src/diagnostics/DiagnosticReport.ts`, `collectPageDiagnostics.ts`, and tests; preserve existing detector API |
| Export privacy | `packages/detector/src/diagnostics/redactReport.ts` and tests |
| Extension UI | Update `spikes/safari-google-cast/extension/content.ts`, `popup.ts`, `popup.html`, and `popup.css` |
| iPad extension packaging | Reuse existing `spikes/safari-google-cast/xcode/` target; update configuration only as needed |
| Native test app | Proposed `spikes/ipad-cast/` Swift/Xcode target, media validation, session service, UI, SDK pinning, tests and run notes; final structure chosen after inspecting existing targets |
| Validation documentation | `docs/IPAD_DIAGNOSTIC_RESULTS.md` and `docs/IPAD_NATIVE_CAST_RESULTS.md`, created when the corresponding tests begin |

Implementation order: report contract and export privacy -> collection and tests
-> popup -> physical iPad diagnostics -> native SDK app -> physical native Cast
validation -> Safari/native feasibility decision.

Part 2 implementation: [native app guide](../spikes/ipad-cast/README.md), with
six native input tests and an unsigned generic-iOS build passing. Physical
results are tracked in [IPAD_NATIVE_CAST_RESULTS.md](IPAD_NATIVE_CAST_RESULTS.md).
