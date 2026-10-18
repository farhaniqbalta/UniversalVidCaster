# M0 physical validation

## Existing baseline supplied by the user

- Date: 2026-10-18.
- Media: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4`
- MIME: `video/mp4`.
- Result: user reports playback works using Chrome's built-in Cast.
- Device model, Chrome version, and exact Cast mode: not recorded.
- Interpretation: useful media/device baseline; does not establish successful
  playback through this project's SDK adapter or iPhone Safari compatibility.

## Harness run

Status: **FUNCTIONAL PASS — user-reported on 2026-10-18.**

After running the project harness, the user reported: “okay all functions works
normally”. This records a successful normal playback/control test reported by
the user, not an independently observed agent test. Detailed receiver telemetry,
hardware versions, and negative-path tests were not supplied.

Recorded results and remaining test details:

| Field | Result |
| --- | --- |
| Date and tester | 2026-10-18, user |
| Sender OS and Chrome version | macOS; Chrome version not recorded |
| Cast device model / firmware | Not recorded |
| Sender origin (localhost or HTTPS) | Local harness served at http://localhost:5173/ |
| Network and permissions | Details not recorded |
| Receiver application | Default Media Receiver (configured by adapter) |
| Media | MDN flower MP4 above (default) |
| SDK chooser and connection | Working per user’s overall functional report |
| Load completion | Working per user’s overall functional report |
| Receiver-reported PLAYING | Exact status/log not separately recorded |
| Visual TV playback confirmation | Playback working per user’s overall functional report |
| Pause / play / seek / stop | Working per user’s overall functional report |
| Disconnect behavior | Working per user’s overall functional report; continuation not separately described |
| TV-side installation | Harness uses existing receiver; no project TV software |
| Limitations / errors | No normal-function issues reported; negative-path checks not recorded |

## Procedure

1. Run the harness using README instructions in desktop Chrome.
2. Connect via the SDK chooser to an existing Cast device.
3. Load the default flower MP4. Record load result separately from receiver state.
4. Confirm PLAYING is reported and verify visible playback on the TV.
5. Pause, resume, seek, and stop. Confirm state changes and actual device behavior.
6. Load again, disconnect, and check that playback continues as described.
7. Reconnect or reload the sender and check session resumption/status.
8. Cancel the chooser and try an unreachable media URL. Confirm errors are shown
   and another valid load can recover. Do not record private signed URLs in logs.

Passing automated checks or the built-in Chrome baseline alone does not close
M0. Passing this procedure establishes only the Cast media path, not Safari MVP.

## M1 regression — 2026-10-18

User-reported pass for the updated harness:

- Inspection finds the flower MP4 with `video/mp4`.
- Selecting the candidate fills the form without starting playback or opening the chooser.
- The selected media plays on the TV.
- Pause, play, seek, stop, and disconnect work normally.
- Inspecting after local playback retains the active source's playback position.
- After refresh, connecting and loading the default flower URL works without detection.

The final check establishes independence from detection. A different manually
entered URL, exact receiver telemetry, hardware versions, and physical error cases
were not independently confirmed by these reports. No Safari test was performed.
