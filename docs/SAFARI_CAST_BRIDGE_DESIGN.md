# Experimental desktop Safari Cast bridge

> Historical plan / experiment record. Earlier priorities, pending statuses, and
> UI instructions below may be superseded. Use the [documentation index](README.md),
> [current handoff guide](IPAD_SAFARI_HANDOFF.md), and
> [consolidated results](IPAD_NATIVE_CAST_RESULTS.md) for current behavior.

Date: 2026-10-21. Status: session/command worker implemented and tested offline;
Swift launcher, runtime packaging, and Safari-to-TV integration not implemented.
This is an experimental macOS design, not an iOS solution or production approval.

## Ownership

```text
Safari popup (UI; may close at any time)
  -> sendNativeMessage request/reply
  -> Swift native extension handler (validates and serializes requests)
  -> inherited stdin/stdout pipes
  -> one Python Cast worker (owns discovery, selected device, receiver events)
  -> existing Cast receiver -> direct media URL
```

The worker persists across commands only while its owning native process/channel
exists. Popup closure is not a reason to stop TV playback. Native-process survival
after closure must be measured, not assumed. If the native process/worker exits,
mark sender state disconnected/unknown and require explicit rediscovery/reconnect;
do not present saved PLAYING state as fresh, or automatically replay media.

Apple's [extension lifecycle guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionOverview.html)
describes short-lived request-oriented extensions; Safari-specific behavior still
requires runtime validation. If an extension-owned worker cannot satisfy the UX,
evaluate a properly packaged macOS XPC/session owner separately. No daemon,
launch-at-login service, localhost server, or app handoff is implemented here.

## Local command contract

Implemented in `spikes/safari-google-cast/transport-experiment/bridge_worker.py`.
This is internal process IPC, not a TV HTTP or proprietary receiver API.

```json
{"id":"request-1","version":1,"command":"connect","args":{"deviceId":"opaque-discovery-id"}}
```

Responses preserve the request ID and contain `ok` plus `result` or a structured
error. One command is processed at a time. Commands: probe, discover, connect,
load, play, pause, seek, stop, status, disconnect. EOF closes sender connections
and discovery; it does not quit the receiver app. Oversized input ends the worker
instead of treating the rest of the frame as a command. Input is capped at 16,384
characters per JSON line; the native side must enforce its own byte/output bounds.

Discovery returns device names and opaque IDs, not a user-supplied IP target.
Connect accepts only IDs from the worker's current discovery results. Load checks
HTTP(S), hostname, absence of embedded credentials, and MIME presence. Native and
TypeScript layers still need stricter schema validation and the shared media
validator. Seek converts milliseconds to seconds and rejects invalid numbers.
The worker supports buffered direct media only; it does not infer live stream type.

Load/control responses say `accepted: true`, not PLAYING. Status requests wait for
a newly received receiver snapshot, or return an error; no cached-status fallback.
The native layer must attach a receive timestamp and reject stale UI state.
Library exceptions are returned as generic transport errors without private URLs
or addresses; diagnostic stderr must remain local and must not be reflected into
UI or persistent logs indiscriminately.

## Packaging and launcher gates

- Keep `ENABLE_APP_SANDBOX=YES`. Do not hardcode temporary interpreter paths in Swift.
- Package the runtime, dependencies, worker, licenses, and native modules in an
  auditable location in the signed product. Inspect nested signatures, sandbox
  inheritance, network permissions, and Python/native-library loading requirements.
- Confirm process spawning is permitted by the Safari extension target and its
  distribution route. Do not assume a successful shell launch proves it.
- Use executable/argument APIs directly; never pass web-provided shell commands,
  executable paths, module names, or environment overrides.
- Serialize native requests on a dedicated queue; correlate IDs, bound output,
  terminate/reap the worker on timeout, and resolve pending replies with explicit errors.
- Avoid replacing a timed-out worker while the old process still owns a session.
- Reopening the popup starts with unknown sender state until a fresh native reply.
- Test multiple tabs/popups, closing/reopening, extension termination, Safari
  restart, permission denial, worker crash, disconnect, and reconnection on the TV.

None of these packaging/Swift gates has passed yet. No sandbox entitlement was
relaxed, no Python binary is copied into the app, and no Xcode target launches
the worker. The source prototype alone does not establish Safari casting.

## Verification

- 12 offline Python tests pass: receiver freshness plus worker command validation,
  invalid media, seek conversion, private error redaction, request correlation,
  EOF cleanup, and oversized-frame rejection.
- A real subprocess handled two diagnostic commands and exited cleanly on EOF.
  It did not discover or control a device during that test.
- Previously, the separate transport probe completed three real control cycles
  with zero warnings. The original SSL warning remains unexplained.
- Existing Safari inspection and native diagnostic messaging remain unchanged.

Next: validate a bundled interpreter and native launch under the current macOS
sandbox before wiring playback controls into the Safari popup.
