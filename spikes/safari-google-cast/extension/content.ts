import { collectPageDiagnostics, redactReport, redactDiagnosticUrl } from '@uvc/detector';
import type { DiagnosticSnapshot } from './snapshot';
import { collectSubtitles, subtitleDiagnostics } from './subtitles';

// The report is redacted. Exact HTTP(S) candidates travel separately, in memory
// only, for the user's explicit Copy original URL action.
const raw = collectPageDiagnostics(document);
const watched = (globalThis as typeof globalThis & { __uvcSubtitleWatch?: { entries: { name: string; startTime: number }[] } }).__uvcSubtitleWatch;
const resources = [...performance.getEntriesByType('resource'), ...(watched?.entries ?? [])];
const subtitles = collectSubtitles(document, raw.candidates.map(candidate => candidate.url), resources);
const diagnostics = subtitleDiagnostics(document, raw.candidates.map(candidate => candidate.url), resources, subtitles);
const snapshot: DiagnosticSnapshot = {
  report: redactReport(raw),
  originalCandidateUrls: raw.candidates.map(candidate => candidate.url),
  subtitles,
  subtitleDiagnostics: { ...diagnostics, observedVttUrls: diagnostics.observedVttUrls.map(redactDiagnosticUrl) },
};
(globalThis as typeof globalThis & { __uvcSafariProbe?: DiagnosticSnapshot }).__uvcSafariProbe = snapshot;
