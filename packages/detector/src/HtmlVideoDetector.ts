import type { DetectedMediaCandidate, DetectionResult, DetectionSource } from './DetectionResult';

/** Inspect only the supplied document. Candidates are not playback guarantees. */
export class HtmlVideoDetector {
  detect(document: Document): DetectionResult {
    const candidates = new Map<string, DetectedMediaCandidate>();
    const limitations = new Set<string>();
    const inferMime = (url: URL) => {
      const extension = url.pathname.toLowerCase().match(/\.[^.\/]+$/)?.[0];
      return ({ '.mp4': 'video/mp4', '.m3u8': 'application/x-mpegURL', '.mpd': 'application/dash+xml' } as Record<string, string>)[extension ?? ''];
    };
    const add = (raw: string | null, video: HTMLVideoElement, source: DetectionSource, mime?: string) => {
      if (!raw?.trim()) return;
      let url: URL;
      try { url = new URL(raw, document.baseURI); }
      catch { limitations.add('A media source has an invalid URL.'); return; }
      if (!['http:', 'https:'].includes(url.protocol)) {
        limitations.add(`${url.protocol} media sources cannot be transferred as direct HTTP(S) media.`); return;
      }
      if (url.username || url.password) {
        limitations.add('A media source with embedded credentials was excluded.'); return;
      }
      const existing = candidates.get(url.href);
      const mimeType = mime?.trim() || inferMime(url);
      if (existing) {
        existing.sources.push(source);
        // An explicit source type is preferable to an extension hint.
        if (mime?.trim() || !existing.mimeType) existing.mimeType = mimeType;
        return;
      }
      const position = source.method === 'currentSrc' && Number.isFinite(video.currentTime) && video.currentTime >= 0
        ? video.currentTime * 1000 : undefined;
      candidates.set(url.href, {
        url: url.href, mimeType, title: video.getAttribute('title') || document.title || undefined,
        sourcePage: document.URL, startPositionMs: position, sources: [source],
      });
    };
    document.querySelectorAll('video').forEach((video, videoIndex) => {
      if (video.mediaKeys) limitations.add('A video has attached media keys; protected playback may require a service-specific receiver.');
      add(video.currentSrc, video, { videoIndex, method: 'currentSrc' });
      add(video.getAttribute('src'), video, { videoIndex, method: 'video-src' });
      video.querySelectorAll('source').forEach(source => {
        add(source.getAttribute('src'), video, { videoIndex, method: 'source-src' }, source.getAttribute('type') ?? undefined);
      });
    });
    if (document.querySelector('iframe, frame')) {
      limitations.add('Frame contents were not inspected; embedded videos may be inaccessible.');
    }
    limitations.add('DOM inspection cannot verify receiver codecs, authorization, DRM, URL expiry, or playback.');
    return { candidates: [...candidates.values()], limitations: [...limitations] };
  }
}
