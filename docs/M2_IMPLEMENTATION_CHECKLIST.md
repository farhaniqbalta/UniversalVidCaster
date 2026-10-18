# M2 implementation checklist — Safari feasibility first

Status: research started; no iPhone implementation or feasibility pass yet.

User decision (2026-10-18): a containing-app handoff is acceptable only for
feasibility testing. The finished product must keep Cast device selection and
controls in Safari. A native-only or handoff-based test cannot satisfy release
acceptance.
See [findings and official sources](M2_SAFARI_FEASIBILITY.md).

## 1. Establish architecture and prerequisites

- [x] Review Google Web/iOS sender and Apple Safari native messaging documentation.
- [x] Identify native handler versus containing-app process boundaries and iOS push limitations.
- [x] Check local Xcode availability: Command Line Tools only; native build unavailable.
- [x] Record UX decision: app handoff allowed for tests only; final device selection and controls must stay in Safari.
- [ ] Install full Xcode and select its developer directory.
- [ ] Record iPhone model/iOS, Xcode version, signing setup, Cast device, and network.
- [ ] Verify current Cast SDK installation, deployment target, license, and extension-safety requirements from official sources before selecting/pinning its version.

## 2. Prove the native sender building block

- [ ] Create a minimal sender-side iOS spike in `spikes/safari-google-cast/`, using the official Cast iOS SDK.
- [ ] Configure Default Media Receiver, SDK Cast UI, local-network description, and required Bonjour entries.
- [ ] Build and run on physical iPhone; record permissions and SDK/device details.
- [ ] Cast the MDN flower MP4 without TV-side installation; confirm receiver state and visible TV playback separately.
- [ ] Test play, pause, seek, stop, disconnect, permission denial, and recovery.
- [ ] Test app background/foreground and session resumption; record actual behavior.

Native-only success proves only this building block, not the Safari product.

## 3. Prove the Safari-to-native path

- [ ] Create the smallest Safari Web Extension target with minimal page permissions.
- [ ] Reuse detector and media validation for permitted current-page inspection and manual URL entry.
- [ ] Verify content-script relay through extension UI/background to the native handler using request/reply.
- [ ] Validate any App Group payload transfer with expiry, validation, and consumed-request handling.
- [ ] Prove an explicitly permitted app-launch/user-handoff mechanism on physical iPhone if that flow is accepted.
- [ ] Demonstrate candidate selection in Safari leading to a native Cast session and TV playback.
- [ ] Test return-to-Safari controls and fresh status, including app suspension and extension popup closure.
- [ ] Prove device selection, connection, loading, controls, and fresh status remain in Safari in the proposed release flow; native test handoff is insufficient.
- [ ] If this Safari flow cannot be achieved, report the blocker before proposing a change to the product requirements.

## 4. Integrate only after the feasibility gate passes

- [ ] Design a Safari-compatible sender adapter around the proven native boundary; preserve controller ownership and receiver-confirmed state.
- [ ] Integrate the extension UI with shared core and detector; do not reuse the Chrome adapter as an iOS transport.
- [ ] Add bridge validation/lifecycle tests and run the existing TypeScript suite/build.
- [ ] Run complete physical-iPhone acceptance, document limitations, and assess distribution requirements.

## Artifacts

Created now:

- `docs/M2_SAFARI_FEASIBILITY.md`
- `docs/M2_IMPLEMENTATION_CHECKLIST.md`

Conditional, after prerequisites and UX decision:

- `spikes/safari-google-cast/`: native sender and minimal Safari bridge proof, build/run notes, physical results.
- `apps/safari-extension/`: production extension only after the sender path is proven.
- A platform adapter package and tests, shaped by the validated bridge contract.

Do not add a TV receiver, proprietary LAN API, backend, webpage casting, or
mirroring. Do not mark M2 complete on native-only or desktop Chrome success.
