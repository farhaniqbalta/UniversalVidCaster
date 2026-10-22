# Third-party Cast sender review

> Historical plan / experiment record. Earlier priorities, pending statuses, and
> UI instructions below may be superseded. Use the [documentation index](README.md),
> [current handoff guide](IPAD_SAFARI_HANDOFF.md), and
> [consolidated results](IPAD_NATIVE_CAST_RESULTS.md) for current behavior.

Reviewed: 2026-10-19. An isolated desktop PyChromecast experiment was subsequently
authorized and run. No candidate is integrated into Safari or selected for
production. This is not a complete dependency, security, or legal audit.

Current experiment results: discovery, connection, and receiver-reported playback
controls worked, and visible TV playback was confirmed by the user on
2026-10-19. An SSL write warning remains unresolved. See the [experiment record](../spikes/safari-google-cast/transport-experiment/README.md).

## Why investigate

Desktop Safari page inspection and native messaging work. A supported macOS
Cast transport has not been identified in the reviewed official SDKs. Third-party
review was authorized after that finding. Isolated installation/testing was
subsequently authorized; Safari integration remains pending. iPhone work is deferred until the final platform check.

Proposed product flow:

```text
Safari webpage -> permitted extension inspection/UI -> native sender bridge
  -> Google Cast-enabled TV's existing receiver -> TV fetches direct media URL
```

The native sender does not automatically read Safari tabs. The extension supplies
permitted page candidates and the Safari UI. An Android TV must actually have
Google Cast built in. No project-specific TV application is allowed.

## Candidates

| Candidate | Findings | Assessment |
| --- | --- | --- |
| [OpenCastSwift](https://github.com/mhmiles/OpenCastSwift) | MIT; native Swift; upstream documents discovery, media load, status, and controls on macOS/iOS. Repository last push observed: 2019-07-07. | Closest native integration shape, but old dependencies and current Swift/device compatibility need substantial review. |
| [PyChromecast](https://github.com/home-assistant-libs/pychromecast) | MIT; Python 3.11+; repository last push observed: 2026-10-15. Manifest reports 14.0.10 and dependencies on protobuf, zeroconf, and casttube. | Preferred candidate for a bounded desktop transport experiment, not a production recommendation. Python packaging/process ownership adds work. |
| [node-castv2-client](https://github.com/thibauts/node-castv2-client) | MIT; observed manifest 1.2.0, castv2 ~0.1.4 and debug ^2.2.0. Repository last push observed: 2021-04-13. | Lower priority because of dependency age and a separate Node runtime requirement. |

Repository push dates are activity signals, not proof of maintained releases,
security, or correct behavior. No Safari-extension compatibility is established
by any candidate's general macOS support. Preserve upstream license/attribution
requirements if a dependency is eventually distributed.

## Connection review

- [OpenCastSwift connection source](https://github.com/mhmiles/OpenCastSwift/blob/master/Source/Networking/CastClient.swift)
  disables certificate-chain validation. Its
  [Carthage lockfile](https://github.com/mhmiles/OpenCastSwift/blob/master/Cartfile.resolved)
  pins SwiftyJSON 4.1.0, Result 3.2.4, and swift-protobuf 1.0.3.
- [PyChromecast socket source](https://github.com/home-assistant-libs/pychromecast/blob/master/pychromecast/socket_client.py)
  sets `check_hostname = False` and `verify_mode = ssl.CERT_NONE`.
  Its [manifest](https://github.com/home-assistant-libs/pychromecast/blob/master/pyproject.toml)
  declares the Python requirement and dependencies described above.
- [Underlying node-castv2 client](https://github.com/thibauts/node-castv2/blob/master/lib/client.js)
  sets `rejectUnauthorized = false` for its TLS connection. The
  [client manifest](https://github.com/thibauts/node-castv2-client/blob/master/package.json)
  declares the dependency on that transport.

These observations concern normal TLS certificate verification. They do not mean
traffic is plaintext and do not establish whether all Cast-specific authentication
mechanisms are present or absent. Device identity verification and local-network
threat exposure require deeper assessment before production use.

## Experiment plan (initial run performed; further validation remains)

1. Obtain explicit go-ahead to install PyChromecast in an isolated environment
   outside the repository. First locate a suitable Python 3.11+ interpreter.
2. Pin the selected library version and record resolved dependencies; keep runtime,
   downloads, device identifiers, and private media URLs out of Git.
3. Discover the user's Cast device, select it explicitly, and test the public MDN
   flower MP4 with its built-in media receiver. No manual TV IP or receiver install.
4. Record connection separately from successful load and receiver-reported PLAYING;
   confirm visible TV playback with the user.
5. Exercise play, pause, seek, stop, disconnect, and fresh status; clean up the
   test session/environment as appropriate.
6. Only after transport success, design Safari/native session ownership and
   extension lifecycle tests. Do not add a public localhost HTTP service or assume
   a long-running process survives extension shutdown.

A desktop Python experiment is a test tool, not a standalone sender product or
an iPhone solution. The eventual user-facing selection and controls must remain
in Safari. Packaging host, helper, IPC, permissions, distribution, and process
lifetime are separate unresolved design questions.

## Authorization boundary

The user subsequently authorized the isolated experiment and selected the target
Cast TV. The library/runtime and downloads remain outside Git. Only our experiment
script, dependency snapshot, and documentation are added to the repository.
Safari integration, production adoption, custom protocol implementation, and an
ongoing helper/service remain separate decisions. No custom TV software is used.
