# Native iPad Cast validation

Latest subtitle result (2026-10-23): user confirmed subtitle loading works, but
reported the Safari extension supplied the previous video's subtitle on a second
video. Record loading as user-confirmed; correct matching/timing on the second
video failed. Extension association filtering was added; physical retest pending.

Subtitle update (2026-10-23): optional external WebVTT URL/language input and
active native Cast text-track loading are implemented in both direct and iPad-local
modes. Subtitle authorization is kept independent. Sixteen native tests and an
unsigned iOS build pass; actual TV subtitle display/timing remains pending.
Safari subtitle discovery remains deferred; changing tracks requires reloading.

Foreground Mac-free implementation update (2026-10-23): the user accepts a
foreground, screen-awake native app. iPad-local VOD playlist preparation/server
and a prepare-and-play UI are implemented. This is not a physical playback pass;
install the update and start a fresh original-URL session with Mac bridge stopped.
Keep URL acquisition/handoff and background execution separate from this gate.

Latest user report (2026-10-23): “it works, the hls preparation” after the
iPad-local flow was supplied. Record iPad-local HLS preparation as user-confirmed;
detailed independent TV video/audio/controls/endurance results and whether the
Mac bridge was stopped were not explicitly repeated in that report. Native
subtitle casting is now requested again and pending implementation; Safari
subtitle auto-discovery remains deferred. A self-contained
[designer handover](NATIVE_IPAD_DESIGNER_HANDOVER.md) covers the next UI/UX work.

Date prepared: 2026-10-21. Updated 2026-10-23: public flower MP4 playback and
Pause/Play/Seek/Stop passed per user report on the native iPad app.

Website HLS result (2026-10-23): after installing the fMP4 update and using the
Mac bridge flow, the user confirmed website video, sound, and seeking on the TV.
This is a physical user-reported pass for the native iPad sender with Mac-hosted
playlists. No final receiver logs, endurance duration, or expiry/recovery evidence
were supplied. It does not establish Mac-free or Safari-only playback.

Update 2026-10-23: user reports the prerequisite documentation and Mac aging-test
steps complete. Detailed endurance/expiry telemetry was not supplied. Native
iPad flower MP4 baseline subsequently passed: the user confirmed TV playback,
then confirmed Pause, Play, Seek, and Stop. Installation and Cast connection
therefore succeeded in this run. No receiver telemetry was supplied, so do not
claim a separately observed PLAYING status or permission denial/recovery test.

| Check | Result |
| --- | --- |
| Intended iPad | M1 iPad Pro (user-reported) |
| Intended iPadOS | 27.0.1 (user-reported) |
| Xcode | 27.1 |
| Official Cast SDK | 4.8.6, exact Swift package pin |
| Dependency | GTMSessionFetcher 3.5.0, resolved |
| Unsigned generic-iOS build | Passed |
| Native automated tests | 16 passed: input/subtitle validation, VOD manifest graph/authorization, and loopback HTTP serving |
| Native WebVTT subtitles on TV | Implemented; rendering/synchronization physical test pending |
| Signing and installation | Passed in this run, implied by successful physical app test |
| Local-network permission and denial/recovery | Pending |
| SDK device selection/connection | Passed in this run, implied by confirmed casting |
| Flower MP4 load request | Passed per user-reported TV playback |
| Receiver-reported PLAYING and fresh status | Pending |
| Visible TV playback | Passed per user report, 2026-10-23 |
| Pause/play/seek/stop | Passed per user report, 2026-10-23 |
| Disconnect behavior | Pending |
| Switch to Safari and return | Playback continuity and control recovery passed per user report, 2026-10-23, Mac bridge running |
| Brief iPad lock/unlock | Playback continuity and control recovery passed per user report, 2026-10-23, Mac bridge running |
| Recovery after actual session/network loss | Pending; normal app return is not evidence of network reconnection |
| Unreachable media recovery | Pending |
| Website HLS via Mac bridge | Video, audio, and seek passed per user report, 2026-10-23; Mac still required |
| iPad-local HLS preparation | User confirmed working, 2026-10-23 |
| Website HLS hosted on iPad, Mac bridge stopped | Detailed independent playback/control/host-off evidence still to record |
| Original website URL without bridge | Not validated on iPad; earlier desktop direct-URL path failed with unsigned child requests returning 401 |
| TV-side installation | Must be zero |

Native-app playback will not establish Safari-to-Cast integration. Keep physical
findings separate from compilation and input-validation tests. Do not infer DRM,
codec compatibility, or authorization needs from a generic failure code.

Site-specific access findings: [SITE_MEDIA_DIAGNOSTIC_FINDINGS.md](SITE_MEDIA_DIAGNOSTIC_FINDINGS.md).
Native HLS update (2026-10-23): explicit audio/video fMP4 settings and the
**Use Mac bridge HLS settings** button are implemented; unsigned iOS build and
seven native input tests pass. The flower preset clears the option, and an fMP4
hint on non-HLS input is rejected. The user installed this update and confirmed
website video/audio/seek using a fresh Mac bridge playlist, as recorded above.
The user also confirmed the follow-up Safari app-switch/return and brief
lock/unlock checks continued working, including playback and control recovery,
with the Mac bridge running. No duration, lifecycle trace, or actual network-loss
test was supplied. This does not establish that an iPad-hosted playlist server
would run while suspended; the Mac served playlists throughout.

Next: design a Mac-free playlist flow with iPad lifecycle limits explicitly
evaluated. Recovery after actual session/network loss remains pending.
Subtitles remain deferred.
