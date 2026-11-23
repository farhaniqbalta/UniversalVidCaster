import { collectPageDiagnostics, redactReport, redactDiagnosticUrl } from '@uvc/detector';
import type { DiagnosticSnapshot } from './snapshot';
import { collectSubtitles, ensureSubtitleWatch, subtitleDiagnostics } from './subtitles';

// The report is redacted. Exact HTTP(S) candidates travel separately, in memory
// only, for the user's explicit Copy original URL action.
const raw = collectPageDiagnostics(document);
// Finding a video also starts watching this tab, so later caption toggles are seen on Refresh.
const watched = ensureSubtitleWatch(globalThis as typeof globalThis & Parameters<typeof ensureSubtitleWatch>[0]);
const resources = [...performance.getEntriesByType('resource'), ...watched.vtt, ...watched.media];
const subtitles = collectSubtitles(document, raw.candidates.map(candidate => candidate.url), resources);
const diagnostics = subtitleDiagnostics(document, raw.candidates.map(candidate => candidate.url), resources, subtitles);
const snapshot: DiagnosticSnapshot = {
  report: redactReport(raw),
  originalCandidateUrls: raw.candidates.map(candidate => candidate.url),
  subtitles,
  subtitleDiagnostics: { ...diagnostics, observedVttUrls: diagnostics.observedVttUrls.map(redactDiagnosticUrl) },
};
(globalThis as typeof globalThis & { __uvcSafariProbe?: DiagnosticSnapshot }).__uvcSafariProbe = snapshot;
