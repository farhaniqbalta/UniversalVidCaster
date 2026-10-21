# Local HLS site test

Updated 2026-10-21. User priority: investigate site playback first; iPad tests
are deferred. The Mac manifest bridge playback test passed per user report.

## Physical result — 2026-10-21

The user generated a bridge URL, loaded it through the Chrome harness, and
reported video playing on the TV. Asked whether it was the correct video with
sound and whether Pause, Play, and Seek worked, the user confirmed “for now yes!”
Record this as a user-reported pass for this session's video, audio, and controls.
No receiver log capture was supplied for this final test.

This validates the Mac-hosted manifest bridge route for this tested session.
It does not yet validate full-duration playback, token expiry/recovery, reconnect,
other episodes, native iPad playback, or a Safari-only sender flow. Keep the Mac
and bridge running for the current session.

## Latest: authorized manifest bridge experiment

User checks confirmed signed master/media/init/segment URLs return HTTP 200
from localhost; unsigned child playlists/init/segments return HTTP 401. User
confirmed `t` is shared across the observed requests and `pm=browser` throughout.
Binary checks returned application/octet-stream, which alone does not establish
packaging or codec support. The earlier diagnostic size-limit message for a
segment does not negate its observed HTTP 200.

A separate, explicitly authorized Mac manifest bridge is now implemented.
Follow [its run instructions](../spikes/hls-manifest-bridge/README.md).
It propagates only the supplied t/pm into listed child URLs and serves rewritten
playlists to the TV. This supersedes the earlier absence of a local server for
the new experiment; the original access diagnostic itself remains unchanged.
The user supplied a fresh URL locally and subsequently confirmed physical Cast
playback as recorded above. No signed URL is retained in this document.

Bridge validation: six synthetic Node rewrite tests pass; the existing 64 tests,
TypeScript checks, web build, and whitespace checks pass. The bridge was started
and its local control page was retrieved successfully at http://localhost:8787.
No live site token was used for these checks.

## What changed

The Chrome harness now has a user-triggered HLS access check and an explicit
fragmented-MP4 audio/video format option for Cast loads. The existing MP4 path
retains its default behavior when that option is off.

Google documents [HLS format configuration](https://developers.google.com/cast/docs/media/streaming_protocols)
and [Web Sender MediaInfo properties](https://developers.google.com/cast/docs/reference/web_sender/chrome.cast.media.MediaInfo).
Without a specified HLS segment format, the receiver attempts transport-stream
handling. This may be a separate format issue for the observed stream, whose
initialization map and MP4 responses suggest fragmented MP4. No bytes from the
site have been parsed to prove that packaging, and the Default Media Receiver's
actual behavior still needs testing. The format option does not solve HTTP 401.

## Run the local test

1. Reopen the video page, start playback, and use the Safari extension's
   **Inspect / Refresh page**, then **Copy original URL** on its HTTPS candidate.
2. Open the running Chrome harness (last verified at `http://localhost:5174/`).
   Refresh to load the updated interface. Paste the original URL in Media URL
   and set MIME to `application/vnd.apple.mpegurl`.
3. Select **Check playlist and child access**. Results appear progressively.
   No Cast device connection is required for this action.
4. Review the input playlist, first video/audio playlists, initialization resources,
   and first segments. Share the redacted result text, not the original URL.
5. If listed resources are accessible, enable **HLS uses fragmented MP4 audio/video**,
   select the Cast device, and retry **Load & play**. Record receiver state and errors
   separately from accepted-load completion and visual playback.
6. If a child returns 401/403, record that access blocker. If status is unknown,
   inspect Chrome's local Network console for a CORS/network/redirect failure.
   Do not interpret a browser access result as a captured TV request.

## Diagnostic limits

- Client-side requests only; no new backend, localhost media proxy, or receiver.
- Uses exact playlist references with standard URL resolution. Parent query values
  are not copied into child URLs; cookies and referrer are omitted.
- Does not modify `pm`, transfer credentials, fetch encryption keys, or rewrite
  manifests. No server authorization workaround is implemented.
- At most nine distinct fetches, ten-second per-request timeout, 512 KiB playlist
  limit, and 1 KiB initialization/segment sample. Only the first selected video
  variant and first declared audio rendition are examined.
- HTTP(S) redirect failures, CORS, and network errors are reported as unknown
  HTTP status unless a readable response was obtained. The checker accepts HTTPS
  URLs only and rejects redaction placeholders/embedded credentials.
- Output contains status, response type, and redacted URLs; response bodies and
  full signed URLs are not logged or persisted by the diagnostic.
- A successful Chrome-origin request does not establish receiver reachability,
  correct codecs, complete stream validity, or usable authorization.

## Verification and pending evidence

64 TypeScript tests pass, including preservation of exact child references,
redacted output, access refusal versus unknown browser failure, map/segment
sampling, key-request exclusion, format validation, and SDK format mapping.
Type checks and production web build pass. Fresh site input is still needed
locally to run the new diagnostic and Cast retry; no expired shared token is used.
