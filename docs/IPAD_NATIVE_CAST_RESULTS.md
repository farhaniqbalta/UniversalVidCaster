# Native iPad Cast validation

Updated 2026-10-23. Consolidated results replace the earlier incremental status
entries. Physical passes below are user reports, not independently collected
receiver telemetry. See [setup](../spikes/ipad-cast/README.md),
[handoff](IPAD_SAFARI_HANDOFF.md), and [architecture](NATIVE_APP_ARCHITECTURE.md).

## Tested setup

- M1 iPad Pro, 11-inch; user-reported iPadOS 27.0.1.
- Existing Google Cast TV: SWTV-22AE-FHD; no additional TV app.
- Native SwiftUI app targeting iPadOS 17+, official Google Cast SDK 4.8.6.
- Foreground, screen-awake native hosting is accepted by the user.

## Physical evidence

| Capability | Result |
| --- | --- |
| App installation and Cast selection | Succeeded in the reported playback runs |
| Public flower MP4 | TV playback and Pause/Play/Seek/Stop confirmed |
| Website HLS with Mac playlist host | Video, audio, and seek confirmed |
| Switch to Safari/return and brief lock/unlock | Continuity/control recovery confirmed with Mac host running; does not establish iPad background hosting |
| iPad-local HLS preparation | Confirmed working |
| Redesigned UI and architecture refactor | User confirmed the supplied functional smoke checks worked, including seeking, replacement, and End casting; no per-action telemetry |
| iPad Safari transfer -> native Paste -> iPad preparation -> TV | Video, audio, and subtitles confirmed after instruction to stop the Mac bridge |
| Subtitle association | Initial stale-video subtitle issue reported; filtering/layout fixes followed by user confirmation that subtitles work after website captions off/on |
| Playback speed, media volume, mute/unmute | User-confirmed functional pass; individual presets/path combinations were not separately reported |
| iPad Safari popup width | Wider popup confirmed working after CSS correction |
| Mac-hosted aging step | Reported complete; precise duration and expiry telemetry not supplied |

The initial direct HLS URL failed because child requests lacked session query
parameters. Preparation now reproduces the observed player's missing `t`/`pm`
parameters using the user-supplied session. It does not renew authorization or
prove compatibility with unrelated providers. Subtitle URLs retain their own
session parameters. Matching media identity does not measure subtitle timing.

## Automated evidence

Latest recorded native check: 31 tests pass, covering input/subtitle validation,
manifest graph preparation and authorization, local HTTP serving, session
contracts, Safari handoff validation, and speed/volume command validation and
capability gating. The speed/volume update and unsigned iPad build passed; its
physical controls subsequently passed per user report. See
[control-specific results](CAST_SPEED_VOLUME.md). Unsigned iOS packaging with the embedded
extension passed. Latest recorded web check: 85 tests, TypeScript checks, and
extension resource build passed. These are recorded development results, not a
new test run performed by this documentation cleanup.

## Remaining validation

- Precisely timed iPad-hosted endurance, 30-minute host expiry, and upstream token expiry.
- Recovery after actual Wi-Fi/session loss and unreachable media.
- Local Network permission denial/recovery and partial teardown failures.
- Detailed independent receiver telemetry and subtitle synchronization measurements.
- Narrow/resizable Safari windows, iPhone layouts, VoiceOver, larger text, keyboard,
  and full redesigned-extension regression coverage.

Host lifetime and token lifetime are separate. Keep the app foregrounded while
hosting; Mac-hosted app-switch tests do not prove suspended iPad hosting works.
Normal navigation/return is not a network-loss recovery test.
