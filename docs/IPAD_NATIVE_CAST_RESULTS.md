# Native iPad Cast validation

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
| Offline native input tests | 7 passed, including native HLS option validation |
| Signing and installation | Passed in this run, implied by successful physical app test |
| Local-network permission and denial/recovery | Pending |
| SDK device selection/connection | Passed in this run, implied by confirmed casting |
| Flower MP4 load request | Passed per user-reported TV playback |
| Receiver-reported PLAYING and fresh status | Pending |
| Visible TV playback | Passed per user report, 2026-10-23 |
| Pause/play/seek/stop | Passed per user report, 2026-10-23 |
| Disconnect behavior | Pending |
| Foreground/background and reconnect | Pending |
| Unreachable media recovery | Pending |
| Website HLS via Mac bridge | Video, audio, and seek passed per user report, 2026-10-23; Mac still required |
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
Next: test iPad background/foreground and reconnection, then design a Mac-free
playlist flow with iPad lifecycle limits explicitly evaluated. Subtitles remain deferred.
