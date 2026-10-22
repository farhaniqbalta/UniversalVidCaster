# Documentation index

Updated 2026-10-23. Start with the current guides below. Historical documents
retain their paths for existing links; their old priorities and pending statuses
are not the current product plan.

## Current guides and evidence

| Document | Purpose |
| --- | --- |
| [Native iPad setup](../spikes/ipad-cast/README.md) | Build, install, use, and test the app |
| [Safari handoff](IPAD_SAFARI_HANDOFF.md) | Extension installation, explicit copy/Paste flow, privacy contract |
| [Native results](IPAD_NATIVE_CAST_RESULTS.md) | Consolidated user-confirmed results and remaining gates |
| [Diagnostic results](IPAD_DIAGNOSTIC_RESULTS.md) | Inspection-specific evidence and untested cases |
| [Native architecture](NATIVE_APP_ARCHITECTURE.md) | Session ownership, service contracts, design swaps |
| [Safari diagnostics](SAFARI_DIAGNOSTICS.md) | Collection, redaction, subtitle association, capture limits |
| [Extension UX](SAFARI_EXTENSION_UX.md) | Popup design, width fix, and UI verification |
| [Design integration](CastDesign/INTEGRATION_NOTES.md) | Adopted native design and implementation differences |

Current flow: Safari inspection -> explicit private clipboard transfer -> native
Paste/review -> select TV -> Direct or Prepare on iPad -> playback controls.
Keep the native app foregrounded while hosting. Subtitles are implemented and
user-confirmed; acquisition may require the website caption off/on workaround.
Detailed endurance, token-expiry/network recovery, and accessibility remain open.

## Supporting tools and technical references

- [DOM media detector](MEDIA_DETECTION.md), [Web Sender integration](CAST_WEB_INTEGRATION.md)
- [Mac HLS bridge](../spikes/hls-manifest-bridge/README.md), [site test history](HLS_SITE_TEST.md)
- [Safari probe packaging](../spikes/safari-google-cast/README.md)
- [Site media findings](SITE_MEDIA_DIAGNOSTIC_FINDINGS.md)

## Historical plans and milestones

These preserve decisions and experiment evidence; consult current guides before
following installation instructions or treating a task as still pending.

- [Original context](UNIVERSAL_CAST_CONTEXT.md)
- [M0 checklist](IMPLEMENTATION_CHECKLIST.md), [M0 physical checks](M0_PHYSICAL_VALIDATION.md)
- [M1 checklist](M1_IMPLEMENTATION_CHECKLIST.md)
- [M2 checklist](M2_IMPLEMENTATION_CHECKLIST.md), [Safari feasibility](M2_SAFARI_FEASIBILITY.md)
- [Two-part iPad plan](IPAD_DIAGNOSTICS_AND_NATIVE_APP_PLAN.md)
- [Mac-free feasibility](MAC_FREE_IPAD_FEASIBILITY.md)
- [Desktop bridge design](SAFARI_CAST_BRIDGE_DESIGN.md), [third-party review](THIRD_PARTY_CAST_REVIEW.md)
- [Designer handover](NATIVE_IPAD_DESIGNER_HANDOVER.md), [original design specification](CastDesign/universal-vidcaster-ipad-design-spec.md)

`CastDesign/*.swift` are designer reference material, not the app's production
backend. Implementation lives under `spikes/ipad-cast/Sources`.

## Documentation maintenance

Record new physical results in the results sheets, keeping user observations
separate from automated checks. Put usage in the setup/handoff guides and
architecture in its dedicated guide. Avoid adding competing “latest priority”
sections to historical plans. Never include original signed URLs or credentials.
