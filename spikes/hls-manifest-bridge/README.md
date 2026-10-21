# Mac HLS manifest bridge experiment

Run `npm run bridge:hls` from the repository root, then open
http://localhost:8787 in Chrome. No new dependencies are needed (Node 22+).

1. In Safari, start the website video and copy a fresh original **master**
   `config-….json?t=…&pm=browser` URL using the diagnostic extension.
2. Paste it into the bridge. Choose the Mac's Wi-Fi/Ethernet address reachable
   by the TV, then click **Prepare playlist**. A VPN address may not work.
3. Copy the generated playlist URL into the Chrome harness's Media URL field
   (the existing harness is at http://localhost:5174; otherwise run `npm run dev`).
4. Set MIME to `application/vnd.apple.mpegurl`, enable **HLS uses fragmented
   MP4 audio/video**, set start to 0, and choose **Select device / Connect**.
5. Choose **Load & play**. Report receiver state/error and whether video **and
   audio** appear on the TV. Successful preparation does not prove playback.

Keep the Mac awake and both devices on the same network. macOS may request
local-network/firewall access for Node. The TV must reach the chosen Mac address
on TCP port 8787. Do not use a localhost URL as the TV's media URL.

Use **Clear all bridge sessions** or Ctrl-C in the bridge terminal to discard
tokens. Preparing a replacement session requires a fresh original master URL.

## Behavior and limits

- This is an opt-in, Mac-only experiment for the observed shared `t` and `pm`
  authorization pattern; it does not install a Safari-to-Cast bridge or iPad app.
- Fetches HTTPS playlists with no cookies or site Origin/Referer, no redirects,
  and a 15-second total timeout / 1 MiB response limit. Private/local destinations
  are blocked for server-side playlist requests, including DNS resolution.
- Rewrites master video/audio/iframe playlist references to random local routes.
  Resolves initialization and media URLs to absolute HTTPS URLs. Adds only the
  supplied `t` and `pm` when absent, including across hosts explicitly referenced
  by the playlist; preserves existing child parameter values.
- The TV fetches media directly. The Mac does not proxy segments, change codecs,
  fake cookies, refresh tokens, or handle encrypted playlists. Encryption tags
  other than METHOD=NONE and HLS variable substitution are rejected.
- Signed URLs and playlist bodies remain in memory; no request logging or file
  persistence. Sessions expire after 30 minutes or sooner if upstream tokens
  expire. Up to eight sessions and 128 playlist routes per session.
- Local controls accept only loopback requests with localhost Host and same-origin
  mutations. Random playback routes are reachable on the LAN and return playlists
  containing authorized URLs: treat a generated bridge URL as a temporary secret.
- Plain LAN HTTP, CORS, TV reachability, format recognition for unusual file suffixes,
  CDN behavior, token expiry, and actual audio/video playback remain physical test
  gates. This experiment does not establish a production design for iPad.

Run `npm run test:bridge` to test rewriting with synthetic URLs; no live token is
needed. Run the normal repository tests, type checks, and build separately.
