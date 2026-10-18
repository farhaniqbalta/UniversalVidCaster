# M2 Safari sender feasibility

Research date: 2026-10-18. Status: **not proven on iPhone**.

## Findings

Google's [Web Sender setup](https://developers.google.com/cast/docs/web_sender)
lists Cast-supported browser platforms and explicitly excludes iOS Chrome.
It provides no supported Web Sender path for iPhone Safari. The existing Chrome
adapter must not be treated as an iOS transport.

Google documents a [native iOS sender integration](https://developers.google.com/cast/docs/ios_sender/integrate)
with app-owned Cast context, device selection, sessions, and media controls.
That establishes a supported native building block, not compatibility with the
Safari native-extension process or a continuously Safari-hosted controller.

Apple's [Safari native messaging documentation](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension)
describes JavaScript-to-native-extension request/reply using `sendNativeMessage`.
Content scripts must relay through extension background/UI scripts. The native
handler is distinct from the containing app; App Groups can share data between
the native handler and app. Apple also states that the containing iOS app cannot
send messages directly to extension JavaScript. The documented macOS persistent
port/push pattern therefore cannot be assumed on iOS.

Google's [iOS permissions and discovery guide](https://developers.google.com/cast/docs/ios_sender/permissions_and_discovery)
requires local-network permission and Bonjour configuration for discovery. These
must be tested in the process that actually owns the native Cast SDK. Denied
permission is a separate test case from an empty device list.

## Candidate to investigate, not an approved replacement architecture

```text
Safari permitted DOM -> shared detector/core -> extension UI/background
  -> native extension request/reply -> App Group pending media request
  -> user-approved containing-app handoff (mechanism must be validated)
  -> native Cast SDK -> existing Default Media Receiver -> direct media URL
```

The containing app is installed on the phone, never the TV. User decision
(2026-10-18): an app handoff is acceptable for testing only. The release flow
must keep device selection and controls in Safari. A handoff-based spike does
not satisfy that requirement and must not become the release architecture.

Do not infer that `sendNativeMessage` launches the containing app, that shared
storage wakes it, or that it can retain live Cast control while suspended. Do not
put Cast into the native extension target without checking extension-safe APIs,
SDK support, discovery UI, and lifecycle behavior.

An explicit app link is a possible handoff mechanism to test, not a guarantee
that arbitrary extension APIs can open the app. Apple documents
[custom URL scheme handling](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)
and [universal links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content).
If used, keep media out of the launch URL: resolve a validated, short-lived
request identifier in App Group storage. Confirm the actual user gesture and
extension-origin behavior on an iPhone. Universal links introduce website/domain
requirements and are not the default for this no-backend spike.

Request/reply status polling could expose saved app snapshots, but cannot itself
keep the app alive or establish fresh receiver state. Returning to Safari must
not leave a stale PLAYING snapshot presented as current telemetry. Controls,
status freshness, reconnection, and background behavior are independent gates.

## Local prerequisites checked

- `xcodebuild -version` fails because the selected developer directory is
  `/Library/Developer/CommandLineTools`; full Xcode is not available in Applications.
- Physical iPhone/iOS version, signing team, device pairing, and provisioning
  have not been established.
- Real Chrome-to-TV playback already passed, but is not Safari evidence.

No iOS target has been generated, no native dependency has been added, and no
physical iPhone, SDK compilation, App Store review, or background lifecycle test
has been performed. Documentation review cannot establish App Store acceptance.

## Decision gate

The user permits a containing-app handoff for the spike only. Install/configure
full Xcode and validate the smallest native sender
on an iPhone before building extension scaffolding. Safari-only device selection and controls are mandatory for the product.
Investigate that requirement as a separate gate and report unsupported behavior
rather than delivering app-only controls as a completed Safari product.

Detailed tasks: [M2 checklist](M2_IMPLEMENTATION_CHECKLIST.md).
