# Safari extension UX research and redesign

Updated 2026-10-23. Shared macOS/iPad extension popup, version 0.0.5.
The established iPad copy/import/cast flow is preserved.

## Research and resulting decisions

- Apple's [popover guidance](https://developer.apple.com/design/human-interface-guidelines/popovers)
  favors a small set of related tasks and restrained sizing. The main screen now
  focuses on finding a video and preparing a transfer, with raw observations and
  report export under a collapsed Diagnostics section. This is our application
  of the guidance; Safari, not the extension, controls its outer presentation.
- Apple's [Safari Web Extensions on iOS session](https://developer.apple.com/videos/play/wwdc2021/10104/)
  calls for responsive extension content across iPhone/iPad screen sizes. The popup
  requests an explicit 800px intrinsic width with narrow/touch adaptations.
  Small devices use the sheet viewport width. The iPad preferred width is not
  clamped to its initial popup viewport: doing so can keep the sizing measurement
  stuck at a narrow width. Safari still controls the outer presentation.

### iPad width correction

The normal Xcode build product already contained the 800px CSS when the user
reported that the popup remained narrow. Removed the `max-width: 100vw`, touch
`min(800px, 100vw)`, and narrow-viewport root-width overrides that could defeat
the preferred width. Small-device sizing now uses screen size rather than the
initial popover viewport. The user confirmed on 2026-10-23 that the corrected
popup width works in iPad Safari. This supports the sizing correction; it does
not independently establish Safari's internal cause. Narrow/resizable Safari
windows and iPhone presentation still need separate confirmation.
- [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  explains the importance of usable targets and spacing. This design chooses
  controls at least 44 CSS px high, visible focus rings, explicit labels, and
  text status in addition to color. Reduced motion and increased contrast have
  CSS treatments. This is not a claim of audited WCAG conformance.
- The validated task already requires Safari-to-app copying and a subtitle-request
  workaround. The redesign explains those actual actions rather than implying
  one-click casting, automatic app launch, or universal media detection.

## Main flow

1. **Find video** (then **Refresh**): explicit inspection remains user-triggered.
2. Choose a video, playback method, and optional associated subtitle. A single
   candidate is preselected; multiple candidates require choosing one.
3. Subtitle language appears only when a subtitle is selected. Invalid language
   disables transfer; no subtitle remains a valid video-only choice.
4. **Copy transfer for iPad** remains accessible at the bottom of the panel.
   Success says **Copied** and gives the native app's Paste Safari transfer step.
5. Missing captions: expand **Can’t find subtitles?** for a short watch -> close
   -> toggle off/on -> reopen/refresh sequence. No capture mechanism changed.

Method descriptions explain Direct vs Prepare on iPad without silently deciding
which is supported. Original signed values stay in memory and explicit clipboard
output, not ordinary selector text. Source hosts and media type are shown in the
main selectors. Individual URL/MIME copying remains in Diagnostics for troubleshooting.
The redacted report remains independent of the private transfer.

## States and feedback

- Initial: play the website video and Find video. Copy is disabled, Diagnostics closed.
- Scanning: Finding indicator, busy semantics, cleared previous selection/report.
- Results: video/subtitle counts, review controls, no implied TV playback success.
- Empty: start the video/retry and acknowledge inaccessible embedded players.
- Permission/restricted page failure: allow website access in Safari and retry.
- Copy success: clear next action; editing selection resets that success message.
- Clipboard unavailable: a visible selected-value fallback outside collapsed
  Diagnostics; the user can hide and clear the private value.

No permanent clipboard/history storage was added to preserve work across popup
closure. The explicit watch survives popup closure in the document for up to five
minutes, while transfer selection is reconstructed on a new inspection. Capture
help directs users to finish capturing before selecting/copying the transfer.

## Structure and theme changes

- `popup.html`: semantic, task-first layout with native selects/disclosures.
- `popup.css`: light/dark tokens aligned with the native app, responsive layout,
  focus/contrast/motion rules. No extra UI framework or remote assets.
- `popupView.ts`: presentation helpers for labels, enablement, conditional language,
  and selection summaries. No inspection, clipboard, or URL storage here.
- `popup.ts`: existing inspection/capture/copy orchestration and snapshot handling.
- Handoff schema, native app importer, media preparation, and Cast services retain
  their existing behavior. No permissions were added.

## Validation

85 web tests, TypeScript checks, and shared extension resource build pass.
Tests cover privacy, explicit-copy behavior, empty/refresh state, collapsed
diagnostics, conditional language, and invalid-language gating. Synthetic-data
headless Chromium rendering was inspected at 520px/light and 360px/dark; measured
document widths matched viewport widths without horizontal overflow. The sticky
primary action remained visible in constrained-height rendering.

These are browser layout checks, not Safari extension/device or VoiceOver tests.
The user confirmed the iPad Safari width correction works on 2026-10-23.
Touch/keyboard behavior, VoiceOver, and the complete redesigned clipboard flow
still need a separate regression pass. Previous functional results establish
the casting baseline only. The earlier Chromium measurements predate the width
correction and do not validate its behavior in narrow Safari windows.

## Install and physical retest

Run `npm run build:safari-probe`, then build/run the iPad app in Xcode (or the
macOS extension target for desktop). Source changes alone do not update the installed
extension. The current generated resources are already rebuilt in this workspace.

On iPad Safari, test Find video, selection with/without subtitles, subtitle watch,
copy confirmation, app Paste, and casting. Also test narrow windows, light/dark,
larger text, keyboard focus, permission failure, and manual clipboard fallback.
