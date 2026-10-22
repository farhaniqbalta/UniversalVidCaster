import type { PageMediaDiagnosticReport } from '@uvc/detector';
import type { SubtitleObservation } from './subtitles';
import type { subtitleDiagnostics } from './subtitles';

/** Original candidates are transient and never included in the shareable report. */
export interface DiagnosticSnapshot {
  report: PageMediaDiagnosticReport;
  originalCandidateUrls: string[];
  subtitles?: SubtitleObservation[];
  subtitleDiagnostics?: ReturnType<typeof subtitleDiagnostics>;
}
