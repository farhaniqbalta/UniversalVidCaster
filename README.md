# Universal VidCaster

Cast website video from iPad Safari to an existing Google Cast-enabled TV using
an explicit Safari-to-native-app transfer. The native SwiftUI app prepares supported
HLS playlists on the iPad and provides playback controls through Google's iOS Cast SDK.
Public receiver-accessible media can be loaded directly.

## Start here

1. Follow the [iPad setup and usage guide](spikes/ipad-cast/README.md).
2. Use the [Safari transfer guide](docs/IPAD_SAFARI_HANDOFF.md) to select a video
   and optional subtitle, copy a transfer, and paste it into the native app.
3. Review [validation results](docs/IPAD_NATIVE_CAST_RESULTS.md) and the
   [documentation index](docs/README.md) for current capabilities and limitations.

The user confirmed iPad Safari transfer, Mac-free foreground HLS preparation,
and TV video/audio/subtitles. Native playback controls and the redesigned app
also passed user-reported checks. These are observations on the tested setup,
not a universal website/device compatibility guarantee.

Keep the native app open and the screen awake while it hosts playlists. The TV
fetches actual media directly from source servers. No Mac playlist host, cloud
service, or additional TV app is needed for this path. Safari capture may require
starting a subtitle watch and toggling captions off/on in the website player.
Automatic app launch, token renewal, live/encrypted HLS preparation, transcoding,
and mirroring are not implemented.

## Development setup

Install Node.js with npm (Node 22.12+ or 24 LTS; `.nvmrc` selects 24), then:

```sh
npm ci
npm run build:safari-probe
```

If npm is missing, install Node.js or correct its PATH and reopen the terminal.
With nvm already installed, use `nvm install` and `nvm use`.
Open `spikes/ipad-cast/iPadCastTest.xcodeproj` in full Xcode, configure signing
for both app and extension, and run on the iPad. See the setup guide for details.
Source changes to the extension require rebuilding resources and reinstalling
through Xcode; they do not update an installed extension automatically.

## Desktop Chrome test harness

```sh
npm run dev
```

Open Vite's localhost URL in desktop Chrome, select a Cast device, and load the
flower MP4 preset or another receiver-accessible media URL with its MIME type.
The official Web Sender SDK needs internet access and a secure context; use HTTPS
outside localhost. Sender and TV must share a network that permits discovery.
An Android TV label alone does not establish Google Cast support.

The optional [Mac HLS bridge](spikes/hls-manifest-bridge/README.md) remains a
supporting diagnostic tool. It is not required by the iPad-local flow.

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run build:safari-probe
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swift test --package-path spikes/ipad-cast
```

Automated tests do not replace physical TV checks. See the validation guide for
remaining endurance, token-expiry, network-loss, and accessibility checks.

## Repository layout

- `spikes/ipad-cast`: native iPad app, embedded Safari extension target, and native tests.
- `spikes/safari-google-cast`: shared Safari inspection/copy UI and packaging probes.
- `packages/core`, `packages/cast-web`, `packages/detector`: TypeScript validation,
  controller, Web Sender adapter, and DOM detection.
- `apps/web-test-harness`: desktop Chrome test client.
- `spikes/hls-manifest-bridge`: optional Mac playlist preparation tool.
- `docs`: current guides, architecture, validation evidence, and labeled historical plans.

Original signed media links are private inputs; exported reports redact query values.
Do not commit session URLs or use redacted report links for playback. No cookie
extraction or DRM handling is implemented.
