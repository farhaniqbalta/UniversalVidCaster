import type { PageMediaDiagnosticReport } from '@uvc/detector';

/** Original candidates are transient and never included in the shareable report. */
export interface DiagnosticSnapshot {
  report: PageMediaDiagnosticReport;
  originalCandidateUrls: string[];
}
