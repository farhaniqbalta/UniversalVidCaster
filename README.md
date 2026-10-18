# Universal VidCaster

Google Cast test harness for desktop Chrome with optional DOM media inspection. The shared TypeScript core is
intended for reuse by a later iPhone Safari extension. Safari sender feasibility
has not been established.

## Run

Install Node.js 22.12+ or 24 LTS, then run from the repository root:

```sh
node --version
npm --version
npm ci
npm run dev
```

If your terminal reports `command not found: npm`, install Node.js with its bundled
npm, or add your existing installation to PATH, then reopen the terminal. The
repository's `.nvmrc` selects Node.js 24 for developers using nvm:

```sh
nvm install
nvm use
```

The nvm commands require nvm to be installed already.

Open the localhost URL printed by Vite in desktop Chrome. The page loads Google's
official Web Sender SDK over the internet. Keep the sender and Cast device on a
network that permits discovery, and allow any Chrome local-network permission
prompt. Use an existing Google Cast-enabled receiver; Android TV branding alone
does not establish Cast support.

1. Select **Select device / Connect** and choose a device in Chrome's SDK chooser.
2. Keep the default flower MP4, or supply a receiver-accessible HTTP(S) media URL
   and MIME type. Select **Load & play**.
3. Check receiver playback status and confirm video is visible on the TV.
4. Exercise pause, play, seek, and stop. Disconnect leaves playback running;
   select Stop first if you want to stop the video.

Use HTTPS when hosting outside localhost. Do not open `index.html` as a file or
substitute an insecure LAN IP URL. The SDK loader checks secure-context support;
localhost casting still needs physical Chrome/device validation.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The production harness is written to `apps/web-test-harness/dist`.
GitHub Actions runs the same checks on pushes and pull requests using Node.js 24.

## Current status and next milestone

The user reports the M0 harness's normal functions working with the MDN flower
MP4. Hardware versions, exact receiver status, and physical error-case results
remain to be recorded in `docs/M0_PHYSICAL_VALIDATION.md`.

M1 adds controller lifecycle hardening and permitted DOM video/source detection.
Use **Inspect page videos** to inspect the harness's local flower video fixture;
**Use this source** fills the manual form without starting playback. See the
[detector guide](docs/MEDIA_DETECTION.md) and
[M1 checklist](docs/M1_IMPLEMENTATION_CHECKLIST.md) for verification and limits.
The user confirmed the updated harness’s six normal-flow manual checks, including casting without detection. M2 is the separate physical-iPhone feasibility
gate for a Safari extension and a supported Cast sender path; Chrome success
does not establish that path.

M2 research and prerequisites are tracked in the
[Safari feasibility findings](docs/M2_SAFARI_FEASIBILITY.md) and
[M2 checklist](docs/M2_IMPLEMENTATION_CHECKLIST.md). Full Xcode and physical-iPhone
validation are required. A containing-app handoff is allowed for testing only;
the finished product must keep device selection and controls in Safari.

## Layout

- `packages/core`: media validation, controller, adapter contract, and state.
- `packages/cast-web`: official Web Sender SDK integration and SDK status mapping.
- `packages/detector`: optional DOM media discovery without platform dependencies.
- `apps/web-test-harness`: manual test client of the shared modules.
- `docs/M0_PHYSICAL_VALIDATION.md`: hardware procedure and results.
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md): progress and acceptance tracking.
- [Project context](docs/UNIVERSAL_CAST_CONTEXT.md): product requirements and architecture.

The SDK chooser owns discovery and selection; the adapter deliberately has no
arbitrary device enumeration or TV IP input. The Default Media Receiver requires
no project-specific TV installation or custom receiver registration.

Direct media must be retrievable by the TV. A recognized extension or successful
load request does not establish codec compatibility or actual playback. No cookie
extraction, DRM bypass, webpage rendering, or mirroring is implemented. Signed
URLs and private addresses may also be inaccessible or expire.

Unit tests use sender SDK doubles, not a simulated TV receiver. They cannot
satisfy the physical M0 acceptance gate.
