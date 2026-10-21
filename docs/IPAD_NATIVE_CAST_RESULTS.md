# Native iPad Cast validation

Date prepared: 2026-10-21. Status: software builds; physical validation pending.

| Check | Result |
| --- | --- |
| Intended iPad | M1 iPad Pro (user-reported) |
| Intended iPadOS | 27.0.1 (user-reported) |
| Xcode | 27.1 |
| Official Cast SDK | 4.8.6, exact Swift package pin |
| Dependency | GTMSessionFetcher 3.5.0, resolved |
| Unsigned generic-iOS build | Passed |
| Offline native input tests | 6 passed |
| Signing and installation | Pending |
| Local-network permission and denial/recovery | Pending |
| SDK device selection/connection | Pending |
| Flower MP4 load request | Pending |
| Receiver-reported PLAYING and fresh status | Pending |
| Visible TV playback | Pending |
| Pause/play/seek/stop | Pending |
| Disconnect behavior | Pending |
| Foreground/background and reconnect | Pending |
| Unreachable media recovery | Pending |
| Original website media candidate | Not tested on iPad; desktop direct-URL path failed and query-free initialization request returned 401. See site findings. |
| TV-side installation | Must be zero |

Native-app playback will not establish Safari-to-Cast integration. Keep physical
findings separate from compilation and input-validation tests. Do not infer DRM,
codec compatibility, or authorization needs from a generic failure code.

Site-specific access findings: [SITE_MEDIA_DIAGNOSTIC_FINDINGS.md](SITE_MEDIA_DIAGNOSTIC_FINDINGS.md). Native flower testing remains the next device gate.
