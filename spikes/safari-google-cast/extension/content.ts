import { collectPageDiagnostics, redactReport } from '@uvc/detector';

// Only a redacted snapshot crosses from the isolated page script to the popup.
const report = redactReport(collectPageDiagnostics(document));
(globalThis as typeof globalThis & { __uvcSafariProbe?: unknown }).__uvcSafariProbe = report;
