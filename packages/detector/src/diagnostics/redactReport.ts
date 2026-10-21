import type { PageMediaDiagnosticReport } from './DiagnosticReport';

/** Preserve URL shape for diagnosis; never export credentials, fragments or query values. */
export function redactDiagnosticUrl(raw: string): string {
  // The injected script and popup both redact. Preserve only our exact safe
  // placeholders on the second pass without retaining opaque source contents.
  if (raw === '[invalid URL omitted]' || /^\[[a-z][a-z0-9+.-]*: source omitted\]$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return `[${url.protocol} source omitted]`;
    url.username = ''; url.password = ''; url.hash = '';
    const entries: string[] = [];
    url.searchParams.forEach((_value, key) => entries.push(key));
    url.search = '';
    for (const key of entries) url.searchParams.append(key, '[REDACTED]');
    return url.href;
  } catch { return '[invalid URL omitted]'; }
}

export function redactReport(report: PageMediaDiagnosticReport): PageMediaDiagnosticReport {
  return {
    ...report, exportPrivacy: 'redacted',
    page: { url: redactDiagnosticUrl(report.page.url), title: '[omitted for privacy]' },
    videos: report.videos.map(video => ({ ...video, sources: video.sources.map(source => ({
      ...source, url: redactDiagnosticUrl(source.url),
    })) })),
    candidates: report.candidates.map(candidate => ({
      ...candidate, url: redactDiagnosticUrl(candidate.url), title: undefined,
      sourcePage: candidate.sourcePage ? redactDiagnosticUrl(candidate.sourcePage) : undefined,
      sources: candidate.sources.map(source => ({ ...source })),
    })),
    frames: report.frames.map(frame => ({ ...frame, src: frame.src ? redactDiagnosticUrl(frame.src) : null })),
  };
}
