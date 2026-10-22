# Native design integration

Updated 2026-10-23. The design is adopted into the native iPad app. The proposal
and its Swift files remain reference material; the app does not compile or use
the proposed SessionModel/SessionModels backend replacement.

Follow-up: the user confirmed the requested UI checks worked. Session actions,
draft/state, and service access have since moved into an injectable WorkspaceSession;
Setup/Player/Diagnostics are separate presentation files. The app root retains
service ownership across design changes. See the
[design-swap architecture guide](../NATIVE_APP_ARCHITECTURE.md).

## Implemented

- An adaptive Setup / Now Playing workspace, side by side at widths of 950 pt
  and above; single setup column with a mini-player entry on smaller widths and
  at accessibility text sizes. Opening Now Playing uses a sheet on compact layout.
- Light/dark design tokens, cards, readable system text, status pills with icon
  and text, explicit system Paste controls, and collapsed host-only URL summaries.
- Direct and Prepare on iPad choices. Native HLS MIME/fMP4/VOD stay automatic in
  iPad mode; optional MIME override and direct-mode switches live in Advanced.
- Optional WebVTT subtitles, English/Indonesian/custom language, an explicit
  include-on-next-load control, and the current Safari capture workaround.
- Official GCKUICastButton, local-network guidance, and app settings action.
- Receiver-driven playback, independent TV / hosting / playback pills, last-update
  timestamp, slider seek on release, and bounded +/-15-second skips. Unknown or
  unsupported seeking is disabled. No synthesized position interpolation.
- Replacement confirmation, Stop, Disconnect, separate hosting-clear confirmation,
  and End casting. The composite waits for the Stop request result before clearing
  hosting and requesting disconnect; per-step results remain visible. Actual session
  callbacks confirm disconnection; the UI does not set connected=false optimistically.
- Structured host expiry, foreground guidance, and a retained-host/disconnected
  notice. Expiry reflects local hosting duration, not upstream token life.
- Diagnostics sheet with the existing logs/status and testing presets; no history,
  analytics, automatic clipboard reads, or persistence of media inputs.
- Bounded seconds/mm:ss/hh:mm:ss validation using the existing media/subtitle
  validation rules; large input cannot overflow an integer reduction.

## Mapping to app code

- `CastWorkspaceView.swift`: adaptive screens, setup draft, player, dialogs, sheets.
- `DesignTokens.swift`: adapted proposal colors/components; fixed nested ButtonStyle
  type naming and guarded formatting against non-finite/overflow values.
- `PlaybackDraft.swift`: validation and MIME inference shared with native tests.
- `CastService.swift`: existing SDK session/media owner retained; adds receiver title,
  awaitable Stop result for ending, and timeout freshness handling. Receiver updates
  are not overwritten with a synthetic Sent state after request acknowledgment.
- `ForegroundManifestHost.swift`: existing server retained; exposes expiry and an
  explicit expired flag for the workspace.

## Deliberate changes from proposal

The workspace uses adaptive SwiftUI stacks rather than introducing a replacement
session architecture or a NavigationSplitView migration. Source links and playback
survive switching between Setup, player, and Diagnostics. Inactive hosting says
availability is unknown, not that it is definitely paused. The local-network prompt
still belongs to the official SDK/system; no inferred permission state is presented
as confirmed. Webpage URL detection is not claimed from a filename heuristic.

Changing subtitle inputs still requires loading from the explicit Start at time;
automatic resume at the current position is not promised. Subtitle text is labeled
configured rather than claiming visible rendering. End casting cannot guarantee
TV Stop if the receiver is unreachable; it preserves the real receiver state.

## Not added

Preparation cancellation, automatic method classification, background hosting,
in-session subtitle toggling, automatic Safari handoff, fake discovery states,
token refresh, or timeline interpolation. Diagnostics copying and custom hardware
shortcuts beyond Cmd-Return/standard field behavior remain follow-up work.

## Verification

- 19 native tests pass, covering time parsing/MIME/input rules plus existing
  subtitle, manifest graph/authorization, and loopback HTTP tests.
- Unsigned iOS and iOS Simulator builds pass. These do not validate SDK behavior
  or UI usability on the physical TV/iPad.
- The installed simulator runtime rejected available iPad device types, so no
  simulator screenshot review was completed. Physical portrait/landscape, narrow
  window, keyboard, Dynamic Type/VoiceOver, slider, replacement, End casting, and
  retained-host tests remain pending. The old UI's physical results remain baseline
  evidence; they do not establish a pass for the redesigned screens.

## Physical review steps

1. Build/run on the iPad in Xcode. App display name is now Universal VidCaster.
2. Use Diagnostics -> Use flower MP4, select the TV, and Cast to TV.
3. Check player layout, Pause/Play/Stop, status freshness, and compact mini-player.
4. Paste a fresh master URL, choose Prepare on iPad, optionally add its own subtitle
   URL, then prepare/cast with Mac bridge stopped. Confirm video/audio/subtitles/seek.
5. Edit setup while playing; ensure playback is not stopped until Replace is
   confirmed. Check retained inputs after validation errors and failed preparation.
6. Check Stop vs Disconnect vs Stop sharing vs End casting. Verify partial-failure
   copy when the receiver is unavailable, without assuming idle/disconnected state.
7. Rotate the iPad, use a narrow window, show the URL keyboard, and increase text
   size. Check focus order, controls, errors, and no signed URLs in ordinary status.
