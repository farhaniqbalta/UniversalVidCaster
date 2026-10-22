# Native iPad Cast validation

Date prepared: 2026-10-21. Updated 2026-10-23: public flower MP4 playback and
Pause/Play/Seek/Stop passed per user report on the native iPad app.

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
| Offline native input tests | 6 passed |
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
| Original website media candidate | Not tested on iPad; desktop direct-URL path failed and query-free initialization request returned 401. See site findings. |
| TV-side installation | Must be zero |

Native-app playback will not establish Safari-to-Cast integration. Keep physical
findings separate from compilation and input-validation tests. Do not infer DRM,
codec compatibility, or authorization needs from a generic failure code.

Site-specific access findings: [SITE_MEDIA_DIAGNOSTIC_FINDINGS.md](SITE_MEDIA_DIAGNOSTIC_FINDINGS.md).
Next: verify native fragmented-MP4 HLS configuration, then test a fresh Mac bridge
playlist from the iPad. The current native app has no explicit fMP4 option, unlike
the validated Chrome harness. Website playback on iPad remains untested.
