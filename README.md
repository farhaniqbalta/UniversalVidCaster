# Universal VidCaster

Google Cast test harness for desktop Chrome with optional DOM media inspection. The shared TypeScript core is
intended for reuse by a later iPhone Safari extension. Safari sender feasibility
has not been established.

## Native iPad Cast test app — Part 2

The [native iPad test app](spikes/ipad-cast/README.md) now builds with Google's
pinned official Cast SDK. Open
`spikes/ipad-cast/iPadCastTest.xcodeproj`, select your signing team and iPad, and
run the flower preset first. Six offline native validation tests pass; physical
iPad discovery/playback and the target website's media remain unverified.
This is a separate native test client, not a completed Safari bridge.

Target-site diagnostic outcome: the current direct-URL path does not play the
site's HLS stream; a query-free initialization request returned 401. See
[the findings](docs/SITE_MEDIA_DIAGNOSTIC_FINDINGS.md). No site workaround is
implemented. Continue native iPad validation with the public flower MP4 first.

## Current site investigation

The user has prioritized the target site's playback before physical iPad testing.
The Chrome harness includes **Check playlist and child access** and an explicit
**HLS fragmented MP4** load option. Follow [the local site test](docs/HLS_SITE_TEST.md).
The original child-resource authorization finding remains open; this update does
not establish working site playback or change server access requirements.

## Run

Install Node.js 22.12+ or 24 LTS, then run from the repository root:

```sh
node --version
npm --version
npm ci
npm run dev
```

If your terminal reports `command not found: npm`, install Node.js with its bundled
npm, or add your existing installation to PATH, then reopen the terminal. The
repository's `.nvmrc` selects Node.js 24 for developers using nvm:

```sh
nvm install
nvm use
```

The nvm commands require nvm to be installed already.

Open the localhost URL printed by Vite in desktop Chrome. The page loads Google's
official Web Sender SDK over the internet. Keep the sender and Cast device on a
network that permits discovery, and allow any Chrome local-network permission
prompt. Use an existing Google Cast-enabled receiver; Android TV branding alone
does not establish Cast support.

1. Select **Select device / Connect** and choose a device in Chrome's SDK chooser.
2. Keep the default flower MP4, or supply a receiver-accessible HTTP(S) media URL
   and MIME type. Select **Load & play**.
3. Check receiver playback status and confirm video is visible on the TV.
4. Exercise pause, play, seek, and stop. Disconnect leaves playback running;
   select Stop first if you want to stop the video.

Use HTTPS when hosting outside localhost. Do not open `index.html` as a file or
substitute an insecure LAN IP URL. The SDK loader checks secure-context support;
normal localhost Chrome playback was confirmed by the user; detailed test records
and physical error-case validation remain open.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The production harness is written to `apps/web-test-harness/dist`.
GitHub Actions runs the same checks on pushes and pull requests using Node.js 24.

## Safari diagnostics — Part 1

The extension now inspects page video metadata and provides a redacted JSON
preview/copy action, independently of casting. See [installation and test steps](docs/SAFARI_DIAGNOSTICS.md).
Software checks pass; physical iPad and target-site tests remain pending.
Part 2 software is now implemented; physical iPad validation is pending.

## Current priority — iPad diagnostics and native Cast test

The main target is the user's M1 iPad Pro (reported iPadOS 27.0.1). Follow the
[two-part plan](docs/IPAD_DIAGNOSTICS_AND_NATIVE_APP_PLAN.md):

1. Build Safari diagnostics to inspect the actual website and export a redacted report.
2. Build an iPad native Cast test app using Google's official iOS SDK.

The parts are independently testable. Keeping Cast selection and controls in
Safari is a later feasibility gate, not a consequence of native-app success.
Mac/Python bridge integration is paused. The earlier work/status below remains
supporting evidence, not the current implementation order.

## Current status and next milestone

As of 2026-10-19:

| Milestone | Status |
| --- | --- |
| M0 — Chrome Cast media path | Normal playback and controls passed per user report with the MDN flower MP4. Detailed hardware/telemetry and physical error cases remain undocumented. |
| M1 — Core hardening and DOM detection | Complete for planned scope: 40 tests, type checks, and web build pass; all six normal-flow manual checks passed per user report. |
| M2 — Safari feasibility | In progress. Desktop Safari inspection and native request/reply passed per user report. Safari Cast transport is not implemented or proven. |

Safari on macOS is the immediate target. iPhone validation is deferred until the
final platform check. Standalone native sender app development is deferred;
Apple-required extension packaging hosts are included only as infrastructure.
The finished product must keep device selection and controls in Safari.

Current M2 blocker: no supported macOS Safari Cast transport has been identified.
The reviewed official iOS SDK has no macOS binary. See the
[transport assessment](docs/M2_SAFARI_FEASIBILITY.md).

An isolated desktop PyChromecast feasibility experiment has run,
following the [third-party source review](docs/THIRD_PARTY_CAST_REVIEW.md).
PyChromecast is installed only in a temporary environment outside the repository;
Safari integration has not been added. Receiver-reported playback and controls
worked, and the user confirmed visible TV playback on 2026-10-19. An observed
SSL write warning remains unresolved.
The experiment must prove discovery, media loading, playback controls, and live
status before any Safari integration decision. Safari remains the interface;
no TV installation is permitted, and iPhone checks remain deferred.

Use **Inspect page videos** in the Chrome harness to discover its local flower
video; **Use this source** fills the manual form without starting playback.
See the [detector guide](docs/MEDIA_DETECTION.md),
[M1 checklist](docs/M1_IMPLEMENTATION_CHECKLIST.md),
[M2 checklist](docs/M2_IMPLEMENTATION_CHECKLIST.md), and
[Safari feasibility findings](docs/M2_SAFARI_FEASIBILITY.md).

## Layout

- `packages/core`: media validation, controller, adapter contract, and state.
- `packages/cast-web`: official Web Sender SDK integration and SDK status mapping.
- `packages/detector`: optional DOM media discovery without platform dependencies.
- `apps/web-test-harness`: manual test client of the shared modules.
- `docs/M0_PHYSICAL_VALIDATION.md`: hardware procedure and results.
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md): progress and acceptance tracking.
- [Project context](docs/UNIVERSAL_CAST_CONTEXT.md): product requirements and architecture.

The SDK chooser owns discovery and selection; the adapter deliberately has no
arbitrary device enumeration or TV IP input. The Default Media Receiver requires
no project-specific TV installation or custom receiver registration.

Direct media must be retrievable by the TV. A recognized extension or successful
load request does not establish codec compatibility or actual playback. No cookie
extraction, DRM bypass, webpage rendering, or mirroring is implemented. Signed
URLs and private addresses may also be inaccessible or expire.

Unit tests use sender SDK doubles, not a simulated TV receiver. They cannot
satisfy the physical M0 acceptance gate.

## Safari feasibility test target

The experimental [bridge design](docs/SAFARI_CAST_BRIDGE_DESIGN.md) now includes a
tested standalone command worker. The Swift launcher/runtime packaging and
Safari-to-TV control integration remain unimplemented.

A minimal Safari extension inspection/native-messaging probe is available under
[`spikes/safari-google-cast`](spikes/safari-google-cast/README.md). Run
`npm run build:safari-probe` before opening its Xcode project. Casting is not
implemented there. Desktop Safari inspection/native messaging passed per user
report; Cast runtime feasibility remains open.

Current M2 priority: test the [desktop Safari probe](spikes/safari-google-cast/README.md)
on macOS first. iPhone validation is deferred until the final platform check.
The macOS probe tests inspection/native messaging only; Cast transport is unproven.

## Local HLS bridge test

For the current site-specific playback experiment, run `npm run bridge:hls` and
open http://localhost:8787. Follow the [Mac manifest bridge instructions](spikes/hls-manifest-bridge/README.md)
to prepare a fresh signed master playlist for the Chrome Cast harness.
The user confirmed correct video, audio, and Pause/Play/Seek in a Mac bridge TV
test. Endurance, token expiry/recovery, and iPad playback remain unverified.
