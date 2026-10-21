# Target-site media findings

Date: 2026-10-21. Platform: desktop Safari on macOS, based on reports and Network
Inspector excerpts supplied by the user. This is not a physical iPad result.
Tokens, full media paths, private query values, and viewing history are omitted.

## Observations

- The user reports another direct MP4 works in the Chrome localhost Cast harness,
  while the site's original candidate does not play. This isolates a site/media
  limitation from a general inability to cast, but no precise receiver error was recorded.
- Safari diagnostics found a blob currentSrc and an HTTPS source labelled HLS.
  One frame was not inspected. No attached media keys were observed; this does
  not establish absence of DRM or other protection.
- The master URL has a `.json` suffix but returned HTTP 200 with
  `application/vnd.apple.mpegurl`. Its body begins `#EXTM3U` and references separate
  audio and video playlists. Video metadata declares 1280×720, approximately
  23.976 fps, `avc1.640029` video and `mp4a.40.2` audio.
- Child playlist paths omit the master URL's query parameters. The supplied
  video media playlist contains `#EXT-X-PLAYLIST-TYPE:VOD`, an `#EXT-X-MAP`
  initialization reference, 1,003 media segments, and `#EXT-X-ENDLIST`.
- Segment references span 30 domains and contain no query strings. Their suffixes
  include `.webp`, `.css`, `.js`, and similar names; suffixes do not establish the
  response media format. No `#EXT-X-KEY` tag appears in the supplied media playlist.
- A browser segment request returned HTTP 200, `video/mp4`, and 478,454 bytes.
  Its actual URL included a `t` value and `pm=browser` absent from the playlist URI.
- The `#EXT-X-MAP` resource, named `runtime.js`, returned HTTP 200, `video/mp4`,
  and 898 bytes when requested by the browser with `t` and `pm=browser`. This is
  consistent with an initialization fragment; its bytes were not parsed.
- The user opened the initialization resource without query parameters and
  received **401 Authorization Required**. Other request context may differ
  between a player request and top-level navigation; the test does not isolate
  which individual parameter/header is necessary.

## Assessment

Classification: **authorization-dependent; not working with our current direct-URL
Cast path**. The playlist's bare initialization URL was refused in the user's
test. This strongly supports child-resource authorization as a cause of Cast
failure, but we have not captured the receiver's own network requests or proven
the complete failure chain.

The browser playback path adds query parameters not present in the playlist.
Ordinary child-URL resolution does not automatically inherit the parent query.
Neither the meaning of `t` nor `pm` was verified from provider documentation.
No cookie requirement, DRM diagnosis, token-rewriting solution, or working
receiver authorization flow has been established. CORS `*` alone does not grant access.

The supplied media playlist totals about 100m15s, whereas the earlier DOM report
showed about 22m44s. Whether these came from the same selected video/session was
not confirmed. Do not combine them into one exact media profile.

## Disposition and next step

- Diagnostic evidence is sufficient to end this website session; no more tokens,
  resource downloads, or private links are needed now.
- Do not classify this site as supported or promise playback. A provider-supported
  Cast/access flow or receiver-accessible authorized playlist would need separate
  validation. No bypass, cookie forwarding, token rewriting, proxy, or custom
  receiver was implemented.
- Continue native iPad testing with the known public flower MP4. Successful native
  playback will validate that sender path independently of this site's access rules.
- If revisiting the site later, use a fresh normal playback session; do not retain
  or rely on previously shared signed URLs. Obtain a sanitized Cast error/status
  and provider-supported integration evidence before designing a remedy.

Related: [Safari diagnostics](SAFARI_DIAGNOSTICS.md),
[native iPad validation](IPAD_NATIVE_CAST_RESULTS.md).

## Follow-up — site prioritized again

The user requested continued site work before iPad testing. The harness now
supports [a bounded local HLS diagnostic and explicit fMP4 format hints](HLS_SITE_TEST.md).
This investigates a possible additional sender-format issue without assuming it
explains or fixes the recorded 401. The initial diagnostic alone did not fix playback.
Fresh private URLs must be supplied locally by the user; none are saved here.

## Latest result — Mac manifest bridge passed

Subsequent user tests showed signed master/media/init/segment requests succeed
from localhost, while unsigned child URLs return 401. The user confirmed matching
`t` and `pm=browser` across the observed working requests. An opt-in Mac bridge
now rewrites playlist references with those session parameters, without segment
proxying. This supersedes earlier statements that no manifest rewriting exists.

The user generated a local bridge URL and confirmed TV playback, then confirmed
the correct video, audio, and Pause/Play/Seek worked “for now.” This is a physical,
user-reported pass for the tested session, without a captured final receiver log.
See [HLS site test](HLS_SITE_TEST.md) for the result and outstanding endurance,
token expiry/recovery, and iPad checks. No tokens or signed URLs are saved here.
