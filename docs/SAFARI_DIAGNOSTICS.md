# Safari video diagnostics

Part 1 implementation, 2026-10-21. Diagnostics do not require native messaging
or a working Cast transport. Part 2 is now a separate
[native iPad test app](../spikes/ipad-cast/README.md), with physical validation pending.

## What is collected

- Video currentSrc, src, and nested source URLs with provenance and URL scheme.
- Source MIME attributes separately from file-extension MIME hints.
- Duration, playback position, video dimensions, paused/ended flags, readyState,
  networkState, media error code, and whether mediaKeys are attached.
- Main-document direct HTTP(S) candidates and uninspected frame references.
- Explicit limitations for blob/nontransferable sources, frames, protected
  media uncertainty, receiver access/codec uncertainty, and changing player state.

Non-finite duration/position/dimensions become `null`. Unknown duration does not
establish live media. A blob URL does not establish MSE. Missing mediaKeys does
not establish unprotected content. MIME does not establish codec compatibility.

Only the main permitted document is inspected; nested frames and shadow roots
are not traversed. There is no network interception, credential extraction,
manifest download, DRM workaround, or receiver compatibility assertion.

## Privacy and export

Raw observations exist transiently inside the isolated injected script. The
report is redacted before crossing to the popup, which redacts it again before
rendering/export. Exact direct-candidate URLs now travel separately in memory
for the explicit Copy original URL action. They are not stored in DOM attributes,
report JSON, logs, native messages, or persistent storage by this feature.

Query values are replaced; URL credentials/fragments and titles are removed.
Opaque non-HTTP source contents and invalid URLs are omitted. This applies to
page URLs, candidate URLs/sourcePage, video sources, and frame URLs. Hostnames,
paths, query names, MIME attributes, and other observations remain; these may
still identify a site/account. Always review the report before sharing.

The report is not a playable media manifest: redacted URLs cannot be used to
reconstruct signed links. Copy uses the clipboard only after a user click. If
clipboard access fails, the readonly report field is selected for manual copying.
Browser exceptions are not printed verbatim because they may contain URLs.

For a local Cast test, select **Copy original URL** on the desired candidate.
This copies the original query values and any fragment. Paste it only into the
local test harness or native test app. If clipboard access fails, a separate
original-URL field is revealed and selected; **Hide and clear original URL** clears
that field. A new inspection also clears it. This field is not included in the
redacted JSON report. Reports remain redacted even after copying an original URL.

## Build and install on the iPad

1. Run `npm ci` if dependencies are missing, then `npm run build:safari-probe`.
2. Open `spikes/safari-google-cast/xcode/UniversalVidCaster Probe/UniversalVidCaster Probe.xcodeproj`.
3. Select your signing team and unique identifiers for both targets, preserving
   the host identifier prefix on the extension. Connect/unlock/trust the iPad;
   enable Developer Mode if Xcode/iPadOS requires it.
4. Select the containing app scheme **UniversalVidCaster Probe** and your iPad as
   the destination; build and run. The app is the extension's packaging host.
5. Enable **Universal VidCaster Diagnostics** in Safari's extension settings.
   The native packaging scheme may still use the old Probe name.
6. Open the page with the video in Safari, open the extension, and grant website
   access when prompted. Restricted/internal pages can refuse injection.

Signing, installation, and page permission behavior require physical iPad
confirmation. An unsigned generic-iOS build cannot be installed directly.
Desktop Safari can use the existing macOS project to check the same popup.

## Test on your actual website

1. Before starting the video, select **Inspect / Refresh page**.
2. Review candidate/source schemes, MIME hints, video state, and limitations.
3. Preview the JSON, select **Copy redacted report**, and verify private query
   values are absent. If needed use the selected report field's Copy action.
4. Start the video on the page, reopen the extension, and inspect again.
5. Compare the snapshots: a player may expose a source only after playback starts,
   or replace a direct source with a blob. Neither snapshot proves Cast support.
6. Repeat with a known direct-media page and an empty page as controls. Loading a
   raw MP4 directly in Safari may produce browser-owned UI rather than a normal
   inspectable page; a simple HTML page containing `<video>` is a better control.
7. Record results in [the iPad results sheet](IPAD_DIAGNOSTIC_RESULTS.md).

Share the redacted report for analysis; there is no need to supply cookies,
authorization headers, passwords, or a private signed media URL.

## Verification

The TypeScript suite has 56 passing tests, including diagnostics collection,
URL redaction/non-mutation, dynamic currentSrc snapshots, source provenance,
non-finite values, attached media keys, iframe limits, popup permission failure,
native-independent inspection, clipboard fallback, and explicit original-URL copy
without leaking originals into the report. Type checks and Safari
resources/web harness builds and unsigned iPadOS/macOS packaging builds pass.
Actual device/site results are tracked separately; automated success is not a compatibility claim.

## Subtitle enhancements — deferred

Priority update (2026-10-21): the user has deferred subtitle work, including
subtitle URL discovery/copying enhancements and TV subtitle validation. These
are not required for the current Mac bridge aging test or initial native iPad
video/audio validation. Existing video inspection and original video URL copying
remain the baseline. Subtitle requests observed manually are not proof that an
extension can discover them or that the TV can display them in sync.

## Current-video subtitle association

Flat-path fix (2026-10-23): the user supplied a report with one master URL at
`/v/<media-id>/config-….json` and a VTT at
`/v/<same-media-id>/subs-legacy/….vtt`, but diagnostics counted zero media IDs.
The previous parser required an extra namespace segment. It now recognizes both
observed layouts: `/v/z<number>/<media-id>/…` and `/v/<media-id>/…`. Layouts remain
distinct; old-video and newer-playback checks apply to both. The watch also
captures flat-path playback requests. No signed URLs are retained here.
Eighty tests, type checks, and extension resource build pass, with regression
coverage for flat-path matching, stale captions, and mixed-layout collisions.
Physical retest after reinstalling the extension remains pending.

If inspection finds no subtitle, the popup now distinguishes **no VTT requests
observed** from **observed requests that could not be matched**. The redacted
report adds `subtitleDiagnostics` with track/resource/current-ID/match counts and
up to 20 redacted observed VTT paths. The user's earlier empty-observations report
did not contain those diagnostics, so it did not establish which cause applied.

For missing resource history: select **Watch new subtitle requests**, close the
popup, switch subtitles off/on in the current player, reopen the popup, and inspect.
The explicit watch uses Resource Timing's PerformanceObserver in the permitted
document, not request interception or private player access. It keeps at most
512 relevant URL observations in isolated-world memory for five minutes; Stop
subtitle watch clears captured entries. Starting again resets the watch. Full
page reload/navigation destroys that document's watch. No captured signed URL is
logged, persisted, or sent to native messaging. Ordinary inspection can still see
the browser's own history after the watch stops. If a player makes no new request,
uses an uninspected frame, or URLs cannot be associated, detection may remain empty.

Updated verification: 77 repository tests, type checks, and extension resource
build pass. Physical request capture and subtitle matching retest remain pending.

Update 2026-10-23: native subtitle loading was confirmed by the user, but a
second video received a subtitle from the first video. Subtitle correctness and
synchronization were therefore not established for that second load.

The extension now collects current subtitle/caption track elements and `.vtt`
Resource Timing entries. Timing history is **not** treated as the current video:
for the observed provider URL layout `/v/<namespace>/<media-id>/…`, history-based
subtitle URLs must match one unambiguous current media candidate identity.
Mismatched IDs, multiple media IDs, and unassociated history are omitted. A newer
playback request for a different media ID suppresses results from stale DOM
sources. No arbitrary latest/first subtitle is selected. Refreshing inspection
clears previous rows and original-copy fallback contents.

This is provider-specific association evidence, not universal episode detection.
DOM track URLs without a recognizable ID are labeled as current track elements;
the page can still expose stale state. Matching IDs do not verify language or
timing. If a page still exposes the old source, reload it, start the desired video,
enable the desired subtitle, and inspect again. Missing resource entries or
unrecognized provider layouts can yield no result rather than a guessed URL.

Original URLs are copied only on an explicit click. `subtitleObservations` in
the shared report are redacted. Video rows also offer **Copy MIME type**.
Rebuild/run the macOS Safari extension target in Xcode after resource build;
the installed extension does not automatically update when source files change.
