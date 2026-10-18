# M2 Safari sender feasibility

Research started: 2026-10-18. Last summarized: 2026-10-19.

## Current result

- Desktop Safari DOM inspection and native request/reply: **user-confirmed pass**.
- JavaScript builds, 40 tests, and TypeScript checks: **pass**.
- Unsigned macOS/iOS probe builds: **pass**.
- Selected iOS Cast SDK API type-check with extension restrictions: **pass**, iOS-only compile evidence.
- Actual Cast discovery, connection, playback, controls, and live status in Safari: **not implemented/proven**.
- Current priority: desktop Safari first. iPhone runtime tests are deferred until the final platform check.
- No standalone sender app work or app handoff is planned now. Generated hosts only package the extension.

The dated sections below retain the research sequence; this summary and the latest
user direction supersede earlier native-first or iPhone-first work orders.

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

## Update — 2026-10-19

The user has deferred standalone iPhone app development and native app-first
spikes. Prioritize the Safari extension's supported sender/bridge feasibility;
only an Apple-required extension packaging host is within that Safari scope.
The earlier native-first sequence is superseded. No Cast-in-Safari capability
is established by this change in work order.

Xcode is now installed at `/Applications/Xcode.app`: per-command developer
selection reports Xcode 27.1 (27A9275), and `safari-web-extension-converter` is
available. Global `xcode-select` still points to Command Line Tools. No global
settings were changed, no app was generated, and no iPhone build was performed.

## Compile-gate evidence — 2026-10-19

The official [Google package manifest](https://github.com/googlecast/google-cast-ios-sdk/blob/main/Package.swift)
currently specifies Cast 4.8.6. Its dynamic archive was downloaded outside the
repository and verified against the manifest SHA-256. The device framework's
Mach-O header has `APP_EXTENSION_SAFE`. A reproducible Swift probe type-checks
context initialization and discovery API calls using `-application-extension`.
These observations remove an immediate import-level blocker but do not establish
that discovery, permissions, native UI, sessions, or lifecycle work in Safari.

A minimal Safari test project now exists under `spikes/safari-google-cast/`,
superseding the earlier no-project status. Its popup inspects permitted page DOM
and requests a native transport diagnostic. The native handler reports casting
as unimplemented. It does not link the Cast SDK or initialize discovery. See the
[probe README](../spikes/safari-google-cast/README.md) for build and physical test steps.

## Latest priority — desktop Safari first (2026-10-19)

User deferred iPhone validation until the final platform check. The immediate
target is Safari on this Mac. A macOS-only extension project now shares the
existing DOM inspector and native diagnostic popup. Its native handler returns
`castImplemented: false`; it does not use the iOS framework on macOS.

The iOS SDK compile evidence above remains iOS-only. Desktop Safari Cast discovery,
sessions, and controls require their own supported transport investigation.
Native messaging success alone will not establish that transport.

## Desktop Safari probe pass — 2026-10-19

User supplied successful flower MP4 inspection (`video/mp4`) and the native reply
`{"castImplemented":false,"version":1,"nativeMessaging":true}`. This establishes
working DOM inspection and extension/native request-reply on the tested Mac.
It does not establish a macOS Cast transport or iPhone compatibility. The next
open gate is a supported desktop Safari sender path for actual Cast sessions.
