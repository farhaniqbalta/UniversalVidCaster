import { collectPageDiagnostics, redactReport } from '@uvc/detector';
import type { DiagnosticSnapshot } from './snapshot';

// The report is redacted. Exact HTTP(S) candidates travel separately, in memory
// only, for the user's explicit Copy original URL action.
const raw = collectPageDiagnostics(document);
const snapshot: DiagnosticSnapshot = {
  report: redactReport(raw),
  originalCandidateUrls: raw.candidates.map(candidate => candidate.url),
};
(globalThis as typeof globalThis & { __uvcSafariProbe?: DiagnosticSnapshot }).__uvcSafariProbe = snapshot;
