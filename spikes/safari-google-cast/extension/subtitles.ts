export interface SubtitleCandidate {
  url: string;
  language: string | null;
  method: 'track-element' | 'resource-timing';
}

/** Observations only: no requests, page script hooks, or private player access. */
export function collectSubtitles(doc: Document, resources: { name: string }[] = []): SubtitleCandidate[] {
  const found = new Map<string, SubtitleCandidate>();
  function add(value: string, language: string | null, method: SubtitleCandidate['method']) {
    try {
      const url = new URL(value, doc.baseURI);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
      if (!found.has(url.href)) found.set(url.href, { url: url.href, language, method });
    } catch { /* Ignore invalid observations. */ }
  }
  doc.querySelectorAll('video track[src], audio track[src]').forEach(track => {
    const kind = track.getAttribute('kind') ?? 'subtitles';
    if (kind === 'subtitles' || kind === 'captions') {
      const src = track.getAttribute('src');
      if (src?.trim()) add(src, track.getAttribute('srclang') || null, 'track-element');
    }
  });
  for (const resource of resources) {
    try {
      const url = new URL(resource.name, doc.baseURI);
      if (!/\.vtt$/i.test(url.pathname)) continue;
      add(url.href, null, 'resource-timing');
    } catch { /* Ignore invalid resource names. */ }
  }
  return [...found.values()];
}
