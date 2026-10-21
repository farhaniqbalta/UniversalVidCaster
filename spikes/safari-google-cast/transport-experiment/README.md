# Isolated desktop Cast experiment

Bridge follow-up (2026-10-21): `bridge_worker.py` adds an experimental serial
JSON-lines command process. It owns session objects across requests and closes
them on EOF. It is not launched by Safari or Swift yet. The
[bridge design](../../../docs/SAFARI_CAST_BRIDGE_DESIGN.md) records the pending
sandboxed runtime/launcher gates. The Python offline suite now has 12 passing tests;
the existing three freshness tests remain included.

Authorized on 2026-10-19. PyChromecast 14.0.10 and dependencies are installed only
in a temporary environment outside the repository. Safari targets do not import
or launch Python. No production transport has been selected.

## Reproduce

Use Python 3.11+ and a temporary virtual environment. The recorded run used
Python 3.12.15. Install `requirements.txt` into that isolated environment, not the
system interpreter. From the repository root:

```sh
/path/to/environment/bin/python spikes/safari-google-cast/transport-experiment/cast_probe.py
/path/to/environment/bin/python spikes/safari-google-cast/transport-experiment/cast_probe.py --device 'Exact device name' --exercise
```

Without `--exercise`, only discover devices. With it, discovery must find exactly
one matching friendly name before loading the public flower MP4 and testing pause,
seek, resume, and stop. A final replay supports visual checking. Optional
`--visual-only` with `--exercise` replays the short clip three times without the
control sequence. These flags intentionally affect the selected TV's playback.
The script closes started sender connections and stops discovery afterward; it
does not request that the receiver application quit.

Local macOS network permission may be required. Device names/IPs printed by the
library belong in local session output, not committed logs. No receiver app,
manual TV IP, local HTTP server, cookies, or private media is required.

## Initial result — 2026-10-19

- Discovery found the user's Cast TV; user explicitly selected the target.
- Connection succeeded and receiver status identified the requested flower MP4.
- Receiver reported PLAYING, PAUSED, resumed PLAYING, and IDLE after Stop.
- A seek to 1.0 seconds was followed by status around 1.41 seconds.
- An SSL write warning (`BAD_LENGTH`) occurred during the sequence. Root cause is
  unconfirmed. Later states and replay succeeded; this is not a clean reliability pass.
- User confirmed visible flower-video playback after the three-replay run on 2026-10-19.
- Initial discovery cleanup attempted to join an unstarted client thread. The
  reusable script fixes this by disconnecting only started worker threads and
  stopping discovery in `finally`.

Receiver observations do not prove Safari integration, robust authentication,
continuous session lifetime, or reliable repeated controls. No third-party code
was modified to suppress the SSL error. Safari/helper ownership and deployment
remain unimplemented. The existing [source review](../../../docs/THIRD_PARTY_CAST_REVIEW.md)
records certificate verification concerns.

Follow-up visual run: user requested another attempt; three flower replays each
reported PLAYING. No additional SSL warning appeared in that run. The user
subsequently confirmed seeing the flower video on the TV.

Result: isolated desktop transport feasibility demonstrated with receiver-state
evidence and user visual confirmation. Reliability is not yet accepted because
of the initial SSL warning. Safari integration remains unimplemented.

## Reliability follow-up — 2026-10-19

Three bounded load/pause/seek/resume/stop cycles completed with **zero captured
PyChromecast warnings**. Every state check required a newly received status
snapshot identifying the flower media, rather than trusting a cached state.
Seek positions were within 0.75 seconds of the 1.0-second target. The script
finished successfully and cleaned up discovery and sender connections. Sanitized
results are in `reliability-results.json`; device names/IPs are omitted.

The probe now sends one status request per wait and listens for fresh events,
instead of repeatedly polling every 250 ms. This reduces redundant traffic; it
is not a proven fix for the original SSL warning. The upstream library and its
TLS verification settings were not modified. No root cause is established.

A similar SSL error appears in an [upstream Home Assistant issue](https://github.com/home-assistant/core/issues/141619),
which was closed as stale/not planned; that report is not evidence of our cause
or of an available fix. Concurrent socket access or network/device behavior
remain hypotheses, not findings. Repeated three-cycle success does not establish
long-session, multiple-device, reconnection, or Safari-extension reliability.

Reproduce the bounded run (affects the explicitly selected TV):

```sh
/path/to/environment/bin/python spikes/safari-google-cast/transport-experiment/cast_probe.py --device 'Exact device name' --exercise --cycles 3 --no-visual
```

Offline status-freshness checks (no TV/network required, experiment dependencies
still needed to import the probe):

```sh
/path/to/environment/bin/python -m unittest discover -s spikes/safari-google-cast/transport-experiment -p 'test_*.py'
```

All three tests pass: cached state rejected, new state accepted as a copied
snapshot, and wrong state rejected. These are separate from the 40 TypeScript
tests. Next work is a Safari/native session-ownership design; no integration is
implemented or approved for production by this test result.
