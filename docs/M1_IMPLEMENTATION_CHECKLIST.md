# M1 implementation checklist

> Historical plan / experiment record. Earlier priorities, pending statuses, and
> UI instructions below may be superseded. Use the [documentation index](README.md),
> [current handoff guide](IPAD_SAFARI_HANDOFF.md), and
> [consolidated results](IPAD_NATIVE_CAST_RESULTS.md) for current behavior.

Status: software implementation complete (2026-10-18). All 40 tests, TypeScript checks, and the production build pass. All six normal-flow manual checks passed per user report on 2026-10-18.

Based on [project context](UNIVERSAL_CAST_CONTEXT.md), milestone M1. The
[M0 checklist](IMPLEMENTATION_CHECKLIST.md) retains the outstanding hardware
metadata, receiver-status confirmation, and physical negative-path checks.
Those reporting gaps do not prevent independent M1 development.

## Scope and implementation order

Extend the existing core and add a framework-independent detector for permitted
DOM media. Reuse the existing Chrome adapter and manual URL flow. Do not build
the Safari extension or an automatic castability indicator in this milestone.

### 1. Harden controller ownership and lifecycle

- [x] Restrict adapter updates to receiver/session state; keep operation busy and error state owned by the controller.
- [x] Make disposal idempotent and reject operations after disposal.
- [x] Prevent pending operations from publishing state after disposal.
- [x] Normalize stale media state when a session disconnects.
- [x] Verify recovery after rejected loads and controls without reporting optimistic playback success.
- [x] Add tests for disposal during an operation, external disconnection, and operation/state ownership.

### 2. Add reusable DOM media detection

- [x] Add `packages/detector` as a TypeScript workspace depending on `@uvc/core`.
- [x] Define `HtmlVideoDetector.detect(document)` returning candidates and detection limitations.
- [x] Inspect accessible `<video>` currentSrc, src, and nested `<source>` URLs.
- [x] Resolve relative URLs against the supplied document's baseURI.
- [x] Accept only HTTP(S) URLs without embedded credentials; deduplicate resolved URLs and retain detection provenance.
- [x] Preserve available title, source page, MIME hints, and finite playback position without requiring MIME inference to succeed.
- [x] Exclude blob, data, mediastream, and other nontransferable URLs with explicit limitations.
- [x] Report iframe inspection boundaries without attempting cross-origin access or claiming no video exists inside inaccessible frames.
- [x] Flag observable encrypted-media evidence as a limitation, not a diagnosis of all protected content.
- [x] Keep detection free of network interception, credential extraction, extension APIs, and Google Cast dependencies.
- [x] Test relative sources, duplicates, currentSrc precedence, source MIME hints, missing MIME, empty pages, invalid URLs, and limitations.

Detection returns possible media, not a promise of receiver compatibility. Avoid
heuristic SUPPORTED labels. An extensionless HTTP(S) candidate remains inspectable
and can be selected; the manual MIME field supplies missing information before load.

### 3. Exercise detection in the existing harness

- [x] Add an explicit inspection action and a small local video fixture using the existing flower sample.
- [x] Display candidate URLs, MIME hints, provenance, and limitations safely using text content.
- [x] Allow selecting a candidate to populate the existing manual media form without automatically loading or casting.
- [x] Preserve manual URL entry and casting even when detection finds nothing or reports limitations.
- [x] State that the harness inspects its own document; it cannot inspect arbitrary tabs or fetch a webpage to extract its private media.
- [x] Keep detection optional and independent of SDK availability.

### 4. Verify and document

- [x] Include the detector in the root TypeScript check and dependency lockfile.
- [x] Run all unit tests, type checks, and the production build.
- [x] Document the detector contract, limitations, and manual harness procedure.
- [x] Record the final software results here; keep physical results in the M0 validation document.

## Planned new files

```text
packages/detector/
  package.json
  tsconfig.json
  src/index.ts
  src/DetectionResult.ts
  src/HtmlVideoDetector.ts
  src/HtmlVideoDetector.test.ts
docs/
  M1_IMPLEMENTATION_CHECKLIST.md
  MEDIA_DETECTION.md
```

Existing files to update: core state/adapter/controller contracts and relevant
tests; harness HTML, TypeScript, and CSS; root and harness package manifests;
`package-lock.json`; `README.md`. Consolidate small detector types if that makes
the API clearer.

## Acceptance

- [x] Controller lifecycle and state ownership have meaningful regression coverage.
- [x] Detector produces normalized, deduplicated candidates from accessible video/source DOM.
- [x] Limitations are visible and no candidate is labelled receiver-compatible by DOM inspection alone.
- [x] Selecting a candidate feeds the existing controller-based casting flow.
- [x] Manual casting remains available regardless of detector outcome.
- [x] Confirm existing M0 controls and the default flower MP4 on a real device after this M1 update (user-reported manual regression pass).
- [x] Unit tests, type checks, and production build pass.

## After M1

M2 validates an actual iPhone Safari extension sender path. Research supported
integration options before implementing extension scaffolding; prove any required
sender-side native bridge on a physical iPhone. Do not substitute a TV application
or assume the Chrome adapter works on iOS. The optional castability indicator is
scheduled after the basic Safari casting path works.

## Software verification results

- 40 tests pass across six files: controller, media validation, SDK loader, Cast
  adapter, detector, and harness candidate selection.
- Root TypeScript checks include the detector and pass.
- Production Vite build passes.
- Offline workspace installation updated the dependency lockfile and reported
  zero known vulnerabilities from available audit data.
- The harness test verifies inspection with unavailable Cast, candidate selection
  without automatic casting, safe title handling, and continued manual input after
  an empty detection result.
- User confirmed all six normal-flow manual checks: flower candidate inspection,
  selection without casting, TV playback, controls, local playback position, and
  casting after refresh without detection. The final check used the default
  flower URL; playback of a different manually entered URL was not established.
- Physical results are recorded in [M0_PHYSICAL_VALIDATION.md](M0_PHYSICAL_VALIDATION.md).
  Safari feasibility, hardware metadata, and negative-path physical checks remain separate.

The implementation additionally adds `apps/web-test-harness/src/main.test.ts`
and expands `vitest.config.ts` to include app tests.
