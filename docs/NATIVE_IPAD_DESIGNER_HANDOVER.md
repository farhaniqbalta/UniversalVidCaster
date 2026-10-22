# Universal VidCaster — native iPad UX/UI designer handover

Prepared: 2026-10-23. Audience: a designer agent with **no repository access**.

Latest implementation/validation update (2026-10-23): the redesigned UI and its
architecture-refactor smoke tests passed per user report. The iPad app now embeds
the Safari extension. Users explicitly select video/method/optional subtitle,
copy one transfer, switch to the app, and Paste Safari transfer to fill setup.
Import does not auto-cast or alter current playback. The user confirmed transfer,
video, sound, and subtitle playback after being asked to stop the Mac bridge.
Foreground operation is still required. This supersedes earlier statements below
that handoff is absent or subtitle rendering is unconfirmed. Automatic app opening,
in-session subtitle toggling, and precise endurance/expiry recovery remain outside
the validated flow. Subtitle capture can still require watching and toggling
subtitles off/on in the original player before inspection.
This document contains the product context, current behavior, constraints, and
design assignment. Do not assume you can inspect source code or other project
documents. Deliver a design specification; implementation is handled separately.

## 1. Product and user goal

Universal VidCaster lets someone send a video found on a website to an existing
Google Cast-enabled TV and control playback from an iPad. The primary device is
an M1 iPad Pro, 11-inch, with user-reported iPadOS 27.0.1. The current test app is
native SwiftUI, targets iPadOS 17+, and uses Google's official iOS Cast SDK 4.8.6.

The primary task is: **paste a playable video link, select a TV, and watch it with
reliable playback controls**. Some websites require playlist preparation before
their video will play on the TV. The app now does that preparation on the iPad.

Earlier exploration prioritized staying inside Safari. The user has explicitly
revised that requirement: **keeping the native iPad app foregrounded and the
screen awake while casting is acceptable**. Design around that accepted behavior.
Safari remains a place to find the video/link; invisible background casting and
Safari-only controls are not required for this iteration.

Working product name: Universal VidCaster. Current development app title:
“iPad Cast Test.” There is no established brand palette, logo, or finished design
system. Propose an appropriate visual direction without assuming brand assets.

## 2. What has actually been validated

| Capability | Evidence/status |
| --- | --- |
| Native iPad device selection and public MP4 playback | User confirmed TV playback |
| Public MP4 Pause, Play, Seek, Stop | User confirmed working |
| Website HLS video, audio, and seek using a Mac playlist host | User confirmed working |
| Switching to Safari/return and brief lock/unlock with Mac host running | User confirmed continuity and control recovery; no precise duration or lifecycle trace |
| Mac-hosted aging-test step | User reported complete; detailed timing/expiry telemetry was not supplied |
| iPad-local HLS preparation | User's latest report: “it works, the hls preparation” |
| Detailed independent iPad-hosted video/audio/control/endurance matrix | Still needs recording; do not infer every case from the latest short report |
| Native external subtitle loading | User confirmed loading; a later video used the previous video's subtitle. Correct matching/timing needs retest after extension filtering |
| Recovery after actual network/session loss | Not validated |
| Automatic Safari-to-app handoff | Not implemented |

The developer's latest checks: 16 native tests and an unsigned iOS build pass.
Tests cover input validation, playlist rewriting, and local HTTP serving. These
are software checks, not evidence that every TV, website, or background scenario
works. Keep user-facing success states grounded in actual receiver state.

## 3. Architecture in plain language

Two playback paths exist:

**Direct media:**

```text
User pastes a media URL -> iPad sends URL to TV -> TV downloads and plays media
```

**Prepare on iPad:**

```text
User pastes original master playlist URL
  -> iPad fetches/prepares playlists in memory
  -> iPad serves those playlists to TV over local Wi-Fi
  -> TV downloads actual video/audio directly from source servers
```

The iPad is a temporary **playlist host**, not a video transcoder or screen-mirror
source. No Mac, cloud account, external processing server, or additional TV app
is required by the iPad-local path. An existing Google Cast receiver on the TV
is required; this is not AirPlay.

Why preparation exists: the observed site's master playlist includes session
authorization parameters (`t` and `pm`) but its child references omit them. The
website player adds those parameters. The iPad reproduces that observed URL
preparation using the original session supplied by the user. It does not invent
tokens, extract cookies, unlock DRM, or guarantee compatibility with other sites.

**Do not expose this protocol explanation as mandatory onboarding.** Describe
the user's action simply, with advanced details available when useful.

## 4. Input acquisition and privacy

Today the input is a **media/playlist URL**, not an arbitrary webpage address.
Pasting a website episode page does not automatically extract its video.

A separate Safari diagnostic extension can inspect exposed media URLs and copy
an original URL for local testing. Its shareable reports redact query values.
Those redacted links cannot play. The native app currently has no automatic
extension handoff or website discovery. Initial testing has used Mac Safari for
link acquisition; complete iPad Safari extraction/handoff is a separate task.

Required design behavior:

- Use a clearly labeled Paste action; do not silently read the clipboard on launch.
- Preserve the full original URL, including its authorization query, when loading.
- Avoid displaying long signatures in cards, status messages, or diagnostics.
  An editable URL field can reveal its input; a collapsed summary can show host
  and a neutral label. Do not persist inputs or build a history without new scope.
- Explain invalid/redacted input with a next action: “Copy the original media
  link again.” Never put secret URLs in error messages or mock screenshots.
- No sign-in, favorites, history, subscriptions, or analytics is currently part
  of the product. Do not add these flows by default.

Safe mock data:

```text
Direct sample: https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4
Prepared-video example: https://media.example.test/master.json?t=EXAMPLE&pm=browser
Subtitle example: https://media.example.test/captions/en.vtt?t=EXAMPLE&pm=browser
TV label: Living Room TV
```

Only the first example is a real public playback sample. Others are fictional
layout data, not functioning media or instructions to test a provider.

## 5. Current app: complete functional inventory

The current UI is one long SwiftUI Form inside a NavigationStack. It is a
development harness, not a design to preserve literally. It has these sections:

| Current area | Controls/content |
| --- | --- |
| Device selection | Device name, official Google Cast button, local-network access explanation |
| Media setup | Original URL, MIME type, title, start time in seconds, live toggle, fMP4 toggle |
| Subtitles | Expandable WebVTT section, Include subtitle toggle, URL and language; activated on next load |
| Mode | “Prepare HLS on this iPad (no Mac)” toggle |
| Presets | “Use flower MP4 preset”; legacy “Use Mac bridge HLS settings” |
| Primary action | “Load & play” or “Prepare on iPad & play” |
| Hosting | Preparation/hosting status; foreground/screen-awake explanation; “Stop iPad hosting and clear session” |
| Playback | Play, Pause, Stop; numeric seek input and Seek button; Refresh receiver status; Disconnect |
| Receiver observations | Connection, playback state, last status timestamp, position/duration, request outcome |
| Diagnostics | Local bounded text log with media URLs omitted |

Known rough edges to resolve in design: advanced MIME/format/live inputs crowd
the main task; Mac testing copy is mixed with iPad-local behavior; a numeric seek
field is cumbersome; hosting state and playback state are scattered. Some current
Mac-specific help text predates iPad-local hosting and is outdated. Do not reuse
that copy as a product requirement.

## 6. Target task flow

Propose a coherent flow that minimizes manual steps and separates setup from
watching while keeping a visible connection between video, device, and playback.
The following ordering is a design baseline, not a requirement for separate screens:

1. **Add video:** explicit paste into one primary URL input; optional title and
   start position; choose Direct or Prepare on iPad in understandable language.
2. **Optional subtitles:** add a separate subtitle URL and language (implemented baseline;
   see section 7). Leave off by default.
3. **Select TV:** use the official Cast device chooser, including permission
   explanation and a clear no-device/retry path. A connection already established
   should be retained; do not require choosing the TV on every load.
4. **Prepare & cast:** validate input, prepare playlists when needed, send load
   request, wait for receiver playback. Show distinct phases without fake progress.
5. **Now playing:** video title, target TV, actual playback state, elapsed/duration,
   seek, Play/Pause, Stop, and the foreground hosting notice when relevant.
6. **Replace video / end session:** make it clear whether TV playback stops,
   connection ends, or local hosting is cleared. Preserve safe navigation back to
   setup without accidentally tearing down a playing session.

For iPad-local mode, MIME is automatically HLS, audio/video format is fMP4,
and the stream is treated as on-demand. Do not ask the user to configure these
for the normal path. Direct mode still needs MIME handling when it cannot be
inferred. A `.json` extension can contain an HLS playlist, so filename inference
is not authoritative. Automatic site classification has not been built; if the
design proposes it, label it as a new dependency rather than current capability.

The current implementation requires a connected TV before preparing/loading.
A design that allows preparation before connection or cancels preparation is a
proposed behavior change and should be flagged for implementation.

## 7. Subtitles: native loading implemented, TV validation pending

The user reinstated **native subtitle casting** after earlier deferring it.
Include it in the app design. Safari subtitle auto-discovery remains deferred.

First supported model: one manually provided external **WebVTT (.vtt)** URL and
language per video load. The site supplied `text/vtt` responses; English (`en`)
and Indonesian (`id`) were observed. Their examples had different video IDs,
so matching subtitles to the exact episode is the user's responsibility for now.

- Optional “Add subtitles” control in video setup, not a required step.
- Fields: complete subtitle URL and language. Use English/Indonesian as useful
  examples without assuming those are the only languages.
- Subtitle URL keeps its **own** authorization. Do not apply the video's token
  automatically or hide that there are two separate inputs.
- The app attaches and activates the track when loading the video in both direct
  and iPad-local modes. URL/language validation runs before local preparation.
  Actual TV subtitle rendering and synchronization have not been confirmed.
- The current expandable section includes an explicit Include subtitle toggle.
  Turning it off omits the external track on the next load, without clearing the
  entered fields. It does not change a track on already-playing media. The flower
  preset also disables subtitle inclusion for its next load.
- Adding/replacing a track may require reloading playback. Do not imply seamless
  mid-play track attachment exists. Show that consequence before replacing it.
- An in-session Off/On action is a desirable proposal, but the native command
  and actual receiver behavior still need implementation/validation.
- No subtitle download service, auto-translation, SRT conversion, timing offsets,
  or automatic discovery is implemented. List these as future ideas, not baseline.
- Distinguish “subtitle configured” from “captions visibly rendering.” Track
  loading failures should not be mislabeled as video authorization failures.

## 8. State model and interaction rules

Design the important combinations without presenting connection, hosting, and
playback as a single misleading green success indicator.

| State/condition | What the user needs |
| --- | --- |
| Empty/setup | Paste link; understand what kind of link is accepted |
| Invalid URL, redacted URL, invalid start/language | Field-level explanation with corrective action |
| Permission not granted | Context before the official Local Network prompt; recovery instructions after denial |
| Discovering/no TV | Progress/empty state with same-Wi-Fi guidance and retry |
| Connected, no video | Target TV visible; ready-to-load action |
| Preparing playlists | Honest indeterminate progress; duplicate preparation/load disabled |
| Preparation failed | Explain fresh URL/access/network/unsupported-format failure without losing editable inputs |
| Host ready, sending load | Explain that media is not confirmed playing yet |
| Buffering | Receiver-derived state, separate from preparation |
| Playing/paused | Transport controls based on actual media state; seek only if supported |
| Load acknowledged, status unknown | Avoid claiming playback; allow status refresh/check-TV guidance |
| Receiver idle/error | Actionable recovery, fresh session if appropriate |
| App inactive while hosting | Hosting may be suspended; do not promise continuity |
| App returns | Refresh status; show stale/unknown state until a fresh update arrives |
| Host expired/cleared | Explain what ended and how to prepare again |
| Disconnected but host retained | Explain that the TV may still play; do not falsely imply Stop |

Current native requests have a 20-second tracking timeout. A timeout means the
outcome is unknown, not definitive playback failure; refresh status before retrying.
Do not derive progress percentage, bitrate, thumbnail, or remaining token life
from data the app does not expose. Position updates currently arrive via receiver
callbacks; a continuously animated timeline may need additional engineering.

## 9. Foreground hosting and session semantics

These behaviors are essential to design accurately:

- **Keep the app open and screen awake during iPad-local casting.** The app
  disables auto-lock while preparing/hosting and restores it when hosting stops
  or expires. The user may still manually lock or leave the app; continuity is
  not guaranteed. Do not use a blocking repeated warning for the normal path.
- Hosting sessions last **30 minutes from successful preparation**, regardless
  of whether the upstream token expires sooner. This is a current test limit,
  not a product promise of 30 minutes of playable media. Countdown UI would need
  a structured expiry value; currently the app mainly exposes status text.
- No automatic token renewal. Recovery may require returning to the original
  website, getting a fresh original link, and preparing again.
- Play/Pause/Stop affect TV media. **Stop does not currently clear hosting**.
- Disconnect leaves TV playback running where supported and does not currently
  clear hosting. The iPad must still serve playlists for its own hosted session.
- “Stop hosting and clear session” removes in-memory playlists and closes the
  listener; the TV can fail on later playlist requests. Buffered media might
  continue briefly. Do not describe it as an immediate TV Stop.
- A proposed “End casting” action can coordinate Stop + clear + disconnect, but
  it is a new composite action whose outcomes/errors must be specified.
- Preparing a replacement session currently replaces the existing local host
  after successful preparation, before the new TV load is confirmed. Consider a
  clear replacement action; do not promise rollback/resume of the old session.

The no-Mac hosting path supports finite on-demand HLS, not live or encrypted
streams. It preloads a bounded playlist graph (32 playlists, depth 4, 1 MiB per
playlist, 8 MiB total). Those limits belong in diagnostics/help, not the main form.
No transcoding, mirroring, DRM handling, cookie extraction, or provider login is
included. Public MP4 remains the simple direct-play baseline.

## 10. Visual and interaction design brief

Create an iPad-first native experience, rather than a desktop dashboard shrunk
onto a tablet. Prefer clear hierarchy, calm surfaces, readable type, a strong
primary action, and a focused playback workspace. The current plain test Form
is not a visual requirement.

- Design portrait and landscape for an 11-inch iPad, plus narrow resizable-window
  behavior. Do not assume the full display is always available.
- Consider a setup/detail or sidebar/player composition only where it improves
  the task; do not fill space with invented media libraries or dashboards.
- Provide light and dark appearances, Dynamic Type behavior, sufficient contrast,
  accessible touch targets, VoiceOver labels/order, and selected/disabled/error
  states that do not rely on color alone.
- Plan keyboard avoidance for long URL entry and numeric fields; prevent the
  primary action and errors from disappearing under the on-screen keyboard.
- Keep the selected TV and casting/hosting state easy to find. Use the official
  Google Cast chooser/button integration; do not invent a custom device scanner.
- Put technical MIME/format switches, presets, refresh, and detailed logs in
  advanced/testing areas. Keep the normal iPad-local path understandable.
- Distinguish persistent hosting guidance from temporary progress, validation,
  and failure feedback. Avoid a wall of technical disclaimers.
- No video preview, artwork, title extraction, or local playback is currently
  supplied automatically. Use honest empty/fallback treatments.

## 11. Required designer deliverables

Return a self-contained Markdown design specification, accompanied by annotated
wireframes/mockups if your tools support them. The implementing agent needs:

1. Information architecture and a primary user-flow diagram, covering direct
   media and prepare-on-iPad paths plus optional subtitles.
2. Annotated screen layouts for setup, device selection integration, preparation,
   now playing, and important error/empty/recovery states.
3. Portrait, landscape, and narrow-window adaptations, including keyboard behavior.
4. Component and visual tokens: typography, spacing, surfaces, colors, icons,
   controls, focus, selection, disabled states, and light/dark appearances.
5. Exact proposed UI copy for primary actions, permissions context, foreground
   hosting, expiry, replacement, and ending a session.
6. A state/action matrix describing what each control does, when enabled, what
   remains visible, and what data survives navigation/retry.
7. Accessibility notes and a short usability-test checklist.
8. A clearly separated list of **existing behavior reused**, **new behavior to
   implement**, and **future/deferred ideas**. Flag dependencies such as subtitle
   SDK integration, automatic type detection, timers, live seeking updates,
   cancellation, or composite End casting.

Do not claim to have changed the app, tested a TV, or added features from this
handover. No repository access is available. Design recommendations may improve
the flow but must distinguish implementation proposals from observed behavior.

## 12. Acceptance criteria for the design

- A first-time user can identify where to paste a media link, select a TV, and
  begin casting without navigating through debugging fields.
- The iPad-local route is clearly Mac-free during playback, while manual Safari
  link acquisition and its current limits remain honest.
- The user understands the foreground/screen-awake requirement before starting.
- Playback and host lifecycle are understandable; Stop, Disconnect, and clearing
  hosting are never ambiguously interchangeable.
- Optional subtitles fit the primary flow without blocking video-only playback.
- Sensitive signed URLs never appear in ordinary status, logs, or mock artwork.
- Unsupported/expired/unreachable inputs have a clear next step without promises
  of automatic token renewal or universal website support.
- Design can be implemented incrementally in the existing native SwiftUI app.
