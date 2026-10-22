# Mac-free iPad playback: design and feasibility gates

> Historical plan / experiment record. Earlier priorities, pending statuses, and
> UI instructions below may be superseded. Use the [documentation index](README.md),
> [current handoff guide](IPAD_SAFARI_HANDOFF.md), and
> [consolidated results](IPAD_NATIVE_CAST_RESULTS.md) for current behavior.

Prepared 2026-10-23. Updated requirement: the user accepts keeping the native
iPad app foregrounded and awake while casting. Foreground iPad-local preparation
and HTTP hosting are now implemented; physical Mac-free playback remains pending.
No hosted service or custom receiver was introduced. Subtitles remain deferred.

The implementation and run steps are in the [native app guide](../spikes/ipad-cast/README.md).
The design below records rationale; background hosting is no longer an acceptance
criterion. Safari video URL acquisition/handoff remains separate pending work.

## Established baseline

The user confirmed native iPad flower playback and Pause/Play/Seek/Stop, then
website video/audio/seek through the Mac manifest bridge. Switching to Safari
and returning, plus brief lock/unlock, continued working with control recovery.
The Mac served playlists in every website test. Recovery after actual network
or session loss and precise endurance/expiry timing remain unmeasured.

The Mac currently fetches HLS playlists, resolves URLs, and adds missing `t` and
`pm` parameters to resources referenced by the supplied playback session. Media
is fetched directly by the TV. A Mac-free design must relocate that playlist
work; changing the sender alone does not solve child authorization.

## First experiment within existing constraints

Use an iPad-local manifest host while the native app is foregrounded:

```text
Safari original master URL (manual copy for first test)
  -> native iPad app validates and prepares VOD playlists
  -> temporary iPad LAN HTTP playlist host
  -> existing Default Media Receiver
  -> authorized media URLs on original servers
```

This retains the Default Media Receiver, no TV installation, and no external
service. It is a foreground feasibility spike, not the final stay-in-Safari flow.
The critical uncertainty is serving playlists after app suspension.

### Proposed implementation

1. Add a separate native playlist-preparation component. Fetch the master and
   selected video/audio playlists with bounded sizes, requests, timeout, and
   depth. Support finite VOD first; reject encryption, variable substitution,
   unsupported URI forms, and live playlists explicitly.
2. Resolve child references against the correct upstream playlist. Preserve
   existing query values; add only the supplied session's t/pm where absent.
   Permit authorized cross-host CDN references without forwarding cookies.
3. Preload the selected VOD playlist graph into memory before casting. Use opaque,
   random session routes. Keep signatures out of logs, persistent storage, and
   diagnostics. Do not fetch video segments or synthesize token refresh.
4. Serve prepared playlists on a temporary LAN listener on the iPad; select a
   reachable Wi-Fi address, provide CORS, and return HLS MIME. Evaluate required
   local-network and transport configuration on device rather than weakening
   app-wide security settings without evidence. Bound sessions and memory.
5. Reuse the validated native HLS fMP4 load path with the local generated URL.
   Keep manual original-URL entry for the spike; extension handoff is later work.
6. On explicit Stop/Clear discard the session according to a documented lifecycle.
   Keep temporary app inactivity separate from explicit teardown, and fail clearly
   on expired or unreachable sessions. Do not change expiry based on UI events.

Implemented areas: `spikes/ipad-cast/Sources/ManifestPreparation.swift`,
`LocalManifestServer.swift`, `ForegroundManifestHost.swift`, native preparation
and loopback server tests, and the existing app's iPad-hosting toggle/button.
The first implementation preloads all referenced playlists within its bounds,
rather than selecting only one variant. Large variant graphs can be rejected.

### Acceptance sequence

- Disconnect/stop the Mac bridge **before** preparing a new iPad-hosted session.
  Start from a fresh master URL; do not reuse an already buffered TV session as
  proof of independent playback.
- Confirm correct video/audio, seek near the beginning and far forward, pause,
  resume, stop, and start a fresh session while the iPad app stays foregrounded.
- Switch to Safari; test continuous playback and far-forward seeking. Repeat
  after brief and extended lock periods, recording actual durations and errors.
- Check whether the TV requests playlists again. Initial buffering or cached VOD
  playlists may mask an unavailable host; continuity alone is insufficient.
- If suspension makes the host unreachable, mark this architecture foreground-only.
  Do not attempt silent audio, unrelated background modes, or periodic keepalive
  tricks to claim persistent hosting. A bounded completion task is not an always-on
  HTTP-server guarantee.

## Architecture decision if the host cannot remain available

| Option | Mac-free | Works independently of iPad host lifetime | Scope change |
| --- | --- | --- | --- |
| iPad-local playlist host | Yes | Unproven; foreground baseline only | Local prototype within current constraints |
| Hosted manifest bridge | Yes | Yes, subject to service availability and tokens | External runtime service; signed URLs leave local devices |
| Custom Web Receiver request handling | Yes | Candidate: authorization logic runs on TV | Registered receiver application and hosted receiver assets; physical validation required |
| Existing Mac bridge | No | Yes, while Mac remains available | Already tested baseline |

A Custom Web Receiver is a hosted HTML/JavaScript application loaded by the
TV's Cast runtime, distinct from manually installing an Android TV application.
It still changes the current Default Media Receiver/no-custom-receiver scope.
Google exposes manifest/segment request handlers and a writable request URL;
using these to apply authorization is a candidate design, not verified support
for this device, HLS engine, initialization requests, or provider.

Before such a receiver test, specify the permitted CDN hosts/path scope, reset
authorization on every load, preserve existing child parameters, and verify all
request classes. Use the original signed master supplied by the iPad; no token
refresh or cookie extraction. Static receiver hosting does not need to receive
media tokens as HTTP requests, but logging/analytics must be excluded from the
receiver implementation. Registration, HTTPS hosting, device registration for
unpublished testing, and a receiver application ID are separate setup gates.

Do not register, publish, upload, or introduce a hosted service without a separate
scope decision. A hosted receiver/service is not required to conduct the first
foreground iPad-local experiment.

## Safari product boundary

Initial local experiment uses the native app foreground. Moving URL acquisition,
device selection, and controls into Safari is a later gate. Extension packaging,
shared storage, and native messaging alone do not establish a persistent SDK
owner or keep an iPad app executing. Retain the user's stay-in-Safari goal and
report any required foreground native-app step explicitly.

## Sources reviewed

- [Apple: extending background execution](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time): background completion is time-limited; ordinary apps can be suspended. The resulting local-host availability risk is an architectural inference.
- [Google: PlaybackConfig](https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.PlaybackConfig): manifest and segment request customization hooks.
- [Google: NetworkRequestInfo](https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.NetworkRequestInfo): requested URL and other request properties.
- [Google: Custom Web Receiver](https://developers.google.com/cast/docs/web_receiver/basic): registered receiver application with hosted HTML5 assets.
- [Google: registration](https://developers.google.com/cast/docs/registration): application IDs and device registration for unpublished receiver testing.
