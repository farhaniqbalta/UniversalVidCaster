# Universal Web Video Cast — Project Context

> Historical plan / experiment record. Earlier priorities, pending statuses, and
> UI instructions below may be superseded. Use the [documentation index](README.md),
> [current handoff guide](IPAD_SAFARI_HANDOFF.md), and
> [consolidated results](IPAD_NATIVE_CAST_RESULTS.md) for current behavior.

**Status:** Planning / pre-implementation  
**Version:** 0.8  
**Last updated:** 2026-10-18

## Current priority update — 2026-10-21

The user clarified that the main goal is casting from an M1 iPad Pro (reported
iPadOS 27.0.1). Current planning order is (1) a Safari diagnostic extension for
the actual website, then (2) an iPad native Cast test app using the official SDK.
See [the two-part plan](IPAD_DIAGNOSTICS_AND_NATIVE_APP_PLAN.md). Desktop Python
bridge integration is paused. Native-app testing is now planned explicitly;
previous deferrals of native-app work/iPad testing no longer set the work order.
The final stay-in-Safari interaction and no-TV-install requirements remain.
Native-app success alone cannot satisfy that interaction requirement.

## Latest session decisions — 2026-10-19

These updates supersede the earlier milestone work order where it differs:

- Safari is the user-facing priority; desktop Safari testing comes first and
  physical iPhone validation is deferred until the final platform check.
- M0 Chrome playback and M1 normal-flow checks passed per user report. Desktop
  Safari DOM inspection and native messaging also passed; Safari casting has not.
- Proposed flow: Safari page -> permitted extension detection/UI -> native sender
  bridge -> existing Google Cast receiver. No project-specific TV installation.
- The native app cannot automatically inspect the current Safari tab; the extension
  supplies permitted candidates and keeps selection/controls in Safari.
- Standalone sender-app work and app handoff are deferred. Required extension
  packaging hosts are infrastructure, not a replacement product.
- Third-party sender library research is authorized because a supported desktop
  Safari transport was not identified. The user subsequently authorized
  isolated PyChromecast installation/testing only, not Safari integration,
  production adoption, or custom protocol implementation.
- Isolated desktop PyChromecast test ran: receiver playback/control states
  observed and visible TV playback confirmed by the user; an SSL write warning remains open. See [third-party review](THIRD_PARTY_CAST_REVIEW.md) and
  [M2 checklist](M2_IMPLEMENTATION_CHECKLIST.md).

## 1. Product vision

Build a reusable system that lets a user watching a video in **Safari on
iPhone** send a directly playable video stream to a **Google Cast-capable TV or streaming device**. The
TV independently retrieves and plays the media; the phone acts as a
controller, **not a screen-mirroring source**.

The **Safari Web Extension on iPhone is the primary product and first
release target**. A local HTML/TypeScript page is a **development and
testing harness only**, not a separate product. Standalone, hybrid, and
desktop sender apps are **lowest-priority possible future integrations**.
Keep the shared SDK portable without spending MVP effort building them.

## 2. Non-negotiable product goals and decisions

> **NO CUSTOM TV APP. GOOGLE CAST FIRST.** The product is an iPhone **Safari Web Extension** that sends supported web videos to an already Google Cast-enabled TV/Chromecast/Google TV device. **The user must not install our Android TV application, side-load an APK, start a custom HTTP server on the TV, or configure a receiver IP address.** A local HTML/TypeScript sender is a testing tool only.

- **P0 product:** iPhone Safari Web Extension. Its real-world ability to initiate a Google Cast session is an **unverified later integration risk**; do not make Safari extension setup a prerequisite for the initial casting proof of concept.
- **First implementation / M0 test tool:** A simple HTML/TypeScript page using the **same production-intended TypeScript core and adapter interface** (not throwaway code) that initiates **real Google Cast** to an existing Cast-capable device, using a supported sender runtime such as desktop Chrome. This proves the protocol/media path without requiring Safari extension setup. It is **not evidence that iOS Safari supports Google Cast**; browser support differs.
- **Lowest priority:** Hybrid/desktop sender applications. Do not build these for MVP.
- **Receiver requirement:** A device with a working **Google Cast receiver already built in**, such as a Chromecast or a Google Cast-enabled TV. **Android TV branding alone does not guarantee Google Cast support.** AirPlay-only devices are out of scope.
- **Protocol:** Google Cast sender/receiver ecosystem, **not** a proprietary HTTP/JSON API (`/v1/play`, `/v1/control`) and **not** direct requests to the TV's LAN IP.
- **MVP playback:** `DIRECT_VIDEO`, using a supported Google Cast media receiver (investigate the **Default Media Receiver** / standard media load and controls) for a TV-accessible MP4/HLS/DASH URL where supported. No custom receiver application required.
- **Future `WEBPAGE` mode:** **Research only; not guaranteed by built-in Cast.** The Default Media Receiver is a media player, **not a generic webpage browser**. A hosted **Custom Web Receiver** may support specialized experiences, but is a separate receiver-side web application and does not guarantee arbitrary webpages, cookies, DRM, or full browser rendering. Never promise webpage casting without a separate feasibility study and explicit no-TV-install validation.
- **Future screen mirroring:** Out of scope; research only, potentially requiring native iOS capture and a different transport.
- **Sender SDK:** Framework-independent TypeScript for detection, media models, session orchestration, and a **pluggable Google Cast sender adapter**. Do not assume a standard Cast SDK is available inside iOS Safari Web Extensions.
- **No TV APK, Kotlin/Media3 receiver, mock TV receiver, proprietary LAN HTTP receiver, backend, or database in MVP.**
- **No DRM circumvention, cookie extraction, protected-stream bypass, or claims of universal site compatibility.**

## 3. Architecture — intended target, conditional on Safari feasibility

```text
 iPhone Safari Web Extension [PRIMARY PRODUCT]
   |-- Optional video castability identifier (TypeScript)
   |-- DOM/media detector (TypeScript)
   |-- UI (HTML/CSS + TypeScript)
   |-- CastController / session state (TypeScript)
   |-- GoogleCastSenderAdapter  <-- platform-specific integration
   |       |  Cast sender integration on iOS Safari: MUST VALIDATE
   |       v
   |   Google Cast discovery + session + media LOAD/controls
   |       |
   v       v
 [Safari]   Google Cast-enabled TV / Chromecast / Google TV
            |   EXISTING receiver runtime; NO APP INSTALL
            v
         Standard media receiver (where compatible)
            |
            v
         Direct media URL / CDN

 M0 FIRST: Local HTML/TypeScript CAST TEST HARNESS (Chrome)
   --> shared CastController + models + CastSenderAdapter interface
   --> GoogleCastWebAdapter (official Google Cast Web Sender SDK)
   --> REAL Cast device / built-in receiver (no TV app)
   --> production-intended core, NOT a disposable demo

 M2 LATER: Safari extension UI + same shared TypeScript core
   --> separate Safari-compatible sender adapter/native bridge, IF feasible

 Future WEBPAGE casting --> separate feasibility investigation
   (NOT a capability of the default media receiver)
 Future mirroring --> separate native iOS feasibility investigation
 Hybrid/Desktop sender --> LOWEST PRIORITY
```

**Architecture rule:** Google Cast is not interchangeable with an arbitrary
`fetch('http://tv-ip:8080/v1/play')`. Device discovery, receiver application
selection, session establishment, media loading, and controls must use a
**supported Google Cast sender integration**. No local-TV HTTP receiver is
part of the intended product.

**Later Safari integration risk (not an M0 blocker):** Google Cast's mainstream Web Sender SDK
is designed for supported browser environments and cannot be assumed to work
inside **Safari on iOS**, including a Safari Web Extension. The iOS Cast SDK
is designed for native iOS applications; whether a Safari Web Extension's
containing app/native messaging bridge can provide a practical, App Store-
compliant Cast flow **must eventually be proven on a physical iPhone**. A native bridge
could mean a containing iOS app component, but it must not require installing
anything on the TV. If Safari cannot initiate/control Cast with an acceptable
user experience, report the blocker and propose alternatives for approval;
**do not silently switch to a custom TV app or proprietary protocol.**

**Receiver constraints:** The Google Cast Default Media Receiver supports
standard media playback rather than arbitrary website rendering. Protected
content and some streams may require a service-specific Cast receiver,
credentials, DRM licenses, or formats unsupported by the default receiver.

## 4. Proposed tech stack

| Area | Choice | Notes |
| --- | --- | --- |
| Primary UI | Safari Web Extension: HTML/CSS + TypeScript | iPhone first |
| Shared core | TypeScript | Models, detector, orchestration, error states; no UI dependency |
| Cast transport | `GoogleCastSenderAdapter` abstraction | Concrete iOS Safari integration is a feasibility gate, not assumed |
| Native integration (conditional) | Swift + Google Cast iOS Sender SDK / extension bridge | Explore only if necessary and feasible; **sender side**, never TV installation |
| First casting test (M0) | Vanilla HTML/CSS + TypeScript in desktop Chrome, using official Google Cast Web Sender SDK | Reuse the actual TypeScript core and `GoogleCastWebAdapter`; no throwaway protocol demo; does not prove Safari compatibility |
| Web sender adapter (M0) | `GoogleCastWebAdapter` wrapping official Cast Web Sender SDK | Isolate browser-specific discovery, sessions, and media operations behind `CastSenderAdapter` |
| Unit tests | Vitest | Mock Cast adapter and controller; no TV receiver simulation required |
| Physical validation | M0: supported sender environment + real Cast device; later: iPhone Safari + real Cast device | Separate protocol feasibility from Safari integration feasibility |
| TV receiver | **Built-in Google Cast receiver** | No Kotlin, Media3, custom APK, or local server |
| Webpage mode | Research-only receiver compatibility | Default Media Receiver cannot render arbitrary webpages |
| Screen mirroring | Uncommitted research | Excluded from MVP |

## 5. Suggested repository structure

```text
universal-cast/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── models/
│   │       ├── controller/CastController.ts
│   │       ├── transport/CastSenderAdapter.ts
│   │       └── index.ts
│   ├── cast-web/
│   │   └── src/GoogleCastWebAdapter.ts  # M0: official Cast Web Sender SDK
│   └── detector/
│       └── src/HtmlVideoDetector.ts
├── apps/
│   ├── web-test-harness/       # BUILD FIRST: M0 real Cast test
│   └── safari-extension/       # PRIMARY PRODUCT, integrate later
├── spikes/
│   └── safari-google-cast/     # LATER: physical iPhone integration feasibility
├── tests/
├── docs/
│   └── UNIVERSAL_CAST_CONTEXT.md
└── package.json
```

**M0 code ownership:** `apps/web-test-harness` is a thin HTML/TypeScript UI; `packages/core` owns reusable controller/models/contracts; `packages/cast-web` owns the Chrome-specific Google Cast SDK integration. Do **not** put session or media-load logic directly into UI event handlers. The web harness is a test client of production-intended modules.

**Do not scaffold `apps/android-tv`, a mock receiver, a Fastify receiver,
or a custom TV HTTP endpoint.** Hybrid/desktop apps remain unscheduled.

## 6. Core data models (draft)

```typescript
export interface MediaCandidate {
  url: string; // TV-accessible HTTP(S) media URL, not blob:
  mimeType?: string;
  title?: string;
  sourcePage?: string;
  startPositionMs?: number;
}

export interface CastDevice {
  id: string;
  name: string;
  // No TV IP/HTTP endpoint required by the public interface.
}

export interface CastSenderAdapter {
  isAvailable(): Promise<boolean>;
  discover(): Promise<CastDevice[]>;
  connect(deviceId: string): Promise<void>;
  load(media: MediaCandidate): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  stop(): Promise<void>;
  disconnect(): Promise<void>;
}
```

This is a **conceptual adapter contract**, not a claim that these methods map
1:1 to every Google Cast SDK. Session ownership, discovery UX, and receiver
application IDs must follow the actual supported SDK/platform integration.

A future discriminated request type may include `DIRECT_VIDEO` and, **only
if separately proven**, `WEBPAGE`. Do not add an implemented webpage mode
or promise an arbitrary-webpage Cast receiver now.

## 7. Protocol and receiver contract — Google Cast, not custom HTTP

The previous proposed `GET /v1/status`, `POST /v1/play`,
`POST /v1/control`, `/v1/capabilities`, and raw HTTP requests to a TV IP
were **superseded and must not be implemented**. They would require a
proprietary receiver app/service, violating the no-TV-install requirement.

Target Google Cast flow (subject to sender API availability):

1. Confirm the iPhone and target are in a supported discovery/network setup.
2. Discover/select a **Google Cast-enabled** device using a supported sender integration.
3. Establish a Cast session with a suitable receiver application.
4. Load a supported direct media URL with content type and metadata.
5. Control playback and observe Cast media status/errors.
6. Disconnect/stop gracefully; distinguish session success from media playback success.

**No proprietary JSON wire protocol is specified by this project.** The
Google Cast SDK/protocol owns the receiver message formats. Core TypeScript
interfaces are internal abstractions only.

## 8. Local test harness requirements (not a product UI)

The local HTML/TypeScript test harness is a **thin consumer of `packages/core` and `packages/cast-web`**, not an independent casting implementation. It may provide media URL entry, MIME
type, title, candidate inspection, log output, and controller tests. It can
exercise actual casting **only in a browser/runtime with a supported Cast
sender integration**. It must not require or create a custom TV receiver.
The **Safari extension on physical iPhone** remains the final MVP release acceptance target, **not the M0 entry condition**.

## 9. Optional video castability identifier (Safari extension)

**Goal:** Offer a lightweight, non-blocking indication of whether the current webpage contains a video that **might** be directly castable. This is an **optional enhancement**, not a prerequisite for casting, device selection, or the MVP release. A user must always be able to try manual casting even when detection is inconclusive.

- Implement as a framework-independent TypeScript function in `packages/detector`, reusable by the Safari extension and the local test harness. Suggested API: `assessPageCastability(document): CastabilityAssessment` (the extension adapter supplies accessible DOM and context; do not hard-code Safari APIs in the core).
- Return `LIKELY_SUPPORTED`, `UNKNOWN`, or `LIKELY_UNSUPPORTED`, along with human-readable `reasons` and optional `candidates` (HTTP(S) media URLs, inferred MIME types, titles). These are **heuristic classifications**, not guarantees of TV playback.
- Inspect accessible `<video>`, `<source>`, `currentSrc`, and `src` values; optionally recognize ordinary `.mp4`, `.m3u8`, and `.mpd` media URLs and MIME types. Do not assume file extensions alone prove compatibility.
- `blob:` / `mediastream:` URLs, inaccessible cross-origin iframes, DRM, expiring signed links, cookie-bound requests, and codec incompatibilities should generally yield `UNKNOWN` or `LIKELY_UNSUPPORTED` with a clear reason, not a false positive.
- No invasive network interception, credential/cookie extraction, DRM bypass, or claim that the extension can reliably inspect every website. Keep permissions minimal and validate Safari-specific restrictions separately.
- UI example: “Video found — may be castable”, “Unable to determine”, or “No directly castable video found”; show a short explanation and permit a manual URL or cast attempt.
- A true `SUPPORTED`/playable confirmation requires **successful loading and playback reported by the actual Cast receiver**. Page inspection alone cannot provide it.
- **Scheduling:** Optional after the basic Safari extension casting path works; it must not delay M0 or the primary MVP.

### Detector responsibilities and limitations


- First-pass detection: inspect permitted DOM `<video>` and `<source>`
  elements, including `currentSrc` and `src`.
- Normalize only HTTP(S) candidate URLs; retain metadata and detection
  method.
- `blob:` and Media Source Extensions URLs are **not** directly
  transferable media URLs.
- Cross-origin iframes, dynamically created players, native Safari media
  requests, and DRM can prevent discovery.
- Safari on iOS has extension API and network inspection limitations.
  Verify real iPhone behavior before promising automatic detection.
- Detection success does **not** equal receiver playback compatibility.

## 10. Compatibility checks

1. Does the target TV/streaming device actually support **Google Cast**?
2. Can the **iPhone Safari Web Extension** discover and start/control a Cast
   session through a supported, feasible integration?
3. Is the media URL directly accessible to the receiver (not `blob:` or
   dependent on Safari-only cookies)?
4. Is the content type/codec/stream supported by the chosen Cast receiver?
5. Does playback require authorization or DRM unsupported by that receiver?
6. Did the Cast receiver report actual playback, not just session connection?

Track `SUPPORTED`, `AUTH_REQUIRED`, `DRM_RESTRICTED`, `UNSUPPORTED`, and
`UNKNOWN` without overclaiming success.

## 11. Security and platform constraints

- Use supported Google Cast discovery, session, and control APIs; do not
  reverse-engineer Cast transport or expose an unauthenticated TV control API.
- Respect Safari Web Extension permissions, user gestures, local-network
  privacy requirements, iOS native bridge constraints, and App Store rules.
- Do not transfer Safari cookies, private headers, or DRM keys to the TV.
- Signed media URLs may expire; the receiver must be able to fetch content.
- `blob:` URLs, MSE pipelines, cross-origin iframes, and FairPlay-protected
  media are not automatically castable through a generic media receiver.
- A Google Cast-enabled TV requires **no project-specific app installation**;
  an optional **sender-side** iOS containing app/bridge is a different issue
  and must be explicitly evaluated.

## 12. MVP scope

**In scope:** Safari extension video candidate detection; TypeScript UI and
core; validated Google Cast sender integration; Cast device selection;
session connection; load/play/pause/seek/stop for compatible direct media;
status/error reporting; unit tests; local testing harness; physical iPhone
and Cast-capable receiver validation.

**Out of scope:** custom Android TV app, Kotlin/Media3 TV receiver, mock TV
receiver, proprietary HTTP-to-TV protocol, manual TV IP/port configuration,
full webpage casting, mirroring, universal video extraction, DRM bypass,
media transcoding, hybrid/desktop apps, backend/cloud/database.

## 13. Roadmap and acceptance criteria

### M0 — Real Google Cast proof of concept (BUILD FIRST)

**Purpose:** Prove that we can send a playable media URL from a simple sender to an **existing Google Cast-enabled TV**, without developing or installing a TV application. **Build M0 on the planned reusable TypeScript architecture, not a disposable spike. Do not build the Safari Web Extension for M0.**

- Start with a minimal **local HTML/CSS + TypeScript sender interface** in **desktop Chrome**, using the **official Google Cast Web Sender SDK**. Chrome is the test runtime because Safari does not officially support the same Web Sender integration; HTML/TypeScript alone cannot supply missing browser Cast capabilities.
- Implement `packages/core` (models, `CastController`, `CastSenderAdapter` interface) and `packages/cast-web` (`GoogleCastWebAdapter`) **during M0**. The UI must call the core rather than directly calling the Google Cast SDK. Do not create a separate throwaway casting implementation.
- Provide manual test media URL input, Cast device selection, Connect, Load, Play, Pause, Stop, and basic playback status/error logging (where supported).
- Use the actual **Google Cast** sender/receiver ecosystem and an existing built-in/standard media receiver. **No Android TV APK, custom TV receiver, mock receiver, proprietary TV HTTP API, or manual TV IP.**
- Test with a known public, receiver-compatible MP4 first; optionally expand to HLS/DASH after success.
- Record device, browser/runtime, receiver application, media URL characteristics, playback result, and limitations.
- Keep the Cast session/control code behind a `CastSenderAdapter`; the **core code is reusable as-is**, while the browser-specific `GoogleCastWebAdapter` may need replacement by a Safari-compatible adapter or native bridge. Do not assume the Chrome adapter works on iPhone Safari.

**M0 exit:** A simple test sender discovers/connects to a real Cast device, loads a compatible media URL, and verifies actual playback on the TV with **zero TV-side installation**. This establishes **Google Cast/media-path feasibility only**, **not iPhone Safari extension feasibility**. M0 may proceed without a Safari extension project or iPhone-specific setup.

### M1 — Harden TypeScript core and add detector

- **Extend and harden the core created in M0** (media models, controller, adapter interface, error states); do not defer the core architecture until M1 or rewrite a throwaway M0 implementation.
- Implement permitted DOM video/source inspection and manual URL support.
- Unit-test with mocked **sender adapters** (not a mock TV receiver).

### M2 — Safari sender integration feasibility and extension MVP (PRIMARY PRODUCT)

- Investigate and validate a practical iPhone Safari Web Extension → Google Cast integration, potentially involving a sender-side Swift containing app/native bridge. This is a **separate platform-specific gate**, not an M0 requirement.
- Validate discovery, connection, media loading, playback controls, permissions, user gestures, and real receiver status on a physical iPhone.
- Integrate the proven sender path with the shared TypeScript core and Safari extension UI.
- If iOS Safari cannot support the intended flow, report the blocker and ask for approval before changing the product architecture; **never substitute a custom TV receiver**.

**MVP release acceptance:** A user can open Safari on iPhone, select a supported public video, select their existing Cast device, and play/control it on TV without screen mirroring or installing anything on the TV. **Passing M0 alone is not MVP completion.**

### Optional enhancement — Page video castability indicator

- Add `assessPageCastability` and a small status indicator to the Safari extension when convenient, after basic casting is validated.
- Keep detection best-effort, permission-conscious, non-blocking, and separately testable; do not treat a heuristic result as guaranteed compatibility.

### M3 — Improve test harness and diagnostics (supporting only)

- Expand the M0 local HTML interface for candidate URL, metadata, diagnostics, and regression testing as needed.
- Reuse the shared core and the supported Web Sender adapter.
- Never substitute test-harness success for physical Safari MVP validation.

### Future research — Full webpage casting

- Determine whether a **hosted Custom Web Receiver** or other supported Cast
  receiver mechanism could render a useful subset of webpages **without TV
  installation**. This is not the Default Media Receiver's functionality.
- Evaluate hosting/registration, website restrictions, authentication,
  navigation, input, DRM, and platform policy.
- Do not promise arbitrary webpage casting or schedule delivery before a
  real feasibility proof.

### Future research — Screen mirroring

- Investigate native iOS ReplayKit and a compatible receiver transport.
- Remains uncommitted, with no MVP dependencies.

### Lowest priority — Hybrid/desktop sender apps

No active milestone. Preserve portability only where inexpensive.

## 14. Open decisions / blockers

1. **Immediate M0:** Which official Google Cast Web Sender SDK setup in desktop Chrome, built-in receiver application, and public MP4 will prove actual playback with no TV app?
2. **Later Safari integration:** What officially supported or practical integration can a Safari Web Extension on iPhone use to initiate Google Cast?
3. Is a sender-side Swift containing app / extension-native bridge required,
   and can it provide the intended in-Safari UX?
4. Which Cast devices and media formats should be in the initial test matrix?
5. Which Cast receiver application can handle our test streams without
   deploying a custom TV app?
6. Which Safari DOM video detection approaches work on real websites?
7. Can webpage casting ever satisfy the **no-TV-install** requirement while
   providing useful playback compatibility? (Post-MVP research only.)

## 15. Guiding principle for future development

**Build an iPhone Safari extension that uses the TV's existing Google Cast
capability. Do not require users to install any app on the TV.** The TypeScript
core must adapt to a validated Cast sender integration, not dictate a custom
receiver protocol. Local HTML is for testing, hybrid/desktop apps are lowest
priority, and webpage casting and mirroring are future feasibility topics.

**Agent guardrail:** If a task mentions “M0 casting test,” the correct task is
**a real Google Cast proof of concept from a minimal supported sender (preferably local HTML/TypeScript in desktop Chrome) to an existing Cast device**, **not** building an Android TV app, custom HTTP receiver,
Kotlin/Media3 playback application, or mock receiver. Stop and flag any
implementation plan that contradicts this constraint.

## 16. Change log

- **v0.8:** Added optional, non-blocking Safari webpage video castability identifier with heuristic status, reasons, reusable TypeScript API, and explicit limits; no changes to M0 or Google Cast architecture.

- **v0.7:** Clarified M0 must use the planned reusable TypeScript core (`CastController`, models, adapter interface) plus `GoogleCastWebAdapter` and thin local HTML UI in desktop Chrome; no disposable demo. Safari sender compatibility remains a separate M2 feasibility gate.
- **v0.6:** Reordered milestones: M0 is a real Google Cast test from a simple HTML/TypeScript sender or supported script/app, **not** Safari extension development. Safari/iPhone sender feasibility moves to M2; M0 success does not imply Safari compatibility.
- **v0.5:** Corrected protocol to Google Cast; made **no TV app installation**
  a non-negotiable requirement; removed proprietary HTTP/JSON receiver and
  Kotlin TV app plans; added blocking Safari sender feasibility spike;
  downgraded generic webpage casting to research-only until demonstrated.
- **v0.4:** Prioritized Safari extension; local HTML as testing only;
  hybrid/desktop lowest priority.
