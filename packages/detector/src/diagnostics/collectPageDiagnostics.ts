import { HtmlVideoDetector } from '../HtmlVideoDetector';
import type { DiagnosticSource, PageMediaDiagnosticReport, VideoObservation } from './DiagnosticReport';

const finite = (value: number) => Number.isFinite(value) ? value : null;

export function collectPageDiagnostics(document: Document): PageMediaDiagnosticReport {
  const detection = new HtmlVideoDetector().detect(document);
  const limitations = new Set(detection.limitations);
  const videos: VideoObservation[] = [];
  const elements = Array.from(document.querySelectorAll('video'));
  for (const [index, video] of elements.entries()) {
    const sources: DiagnosticSource[] = [];
    const add = (raw: string | null, method: DiagnosticSource['method'], mime: string | null = null) => {
      if (!raw?.trim()) return;
      let url = raw, scheme = 'invalid', mimeHint: string | null = null;
      try {
        const parsed = new URL(raw, document.baseURI);
        url = parsed.href; scheme = parsed.protocol;
        const ext = parsed.pathname.toLowerCase().match(/\.[^.\/]+$/)?.[0] ?? '';
        mimeHint = ({ '.mp4': 'video/mp4', '.m3u8': 'application/x-mpegURL', '.mpd': 'application/dash+xml' } as Record<string, string>)[ext] ?? null;
      } catch { limitations.add('An observed media source has an invalid URL.'); }
      sources.push({ method, url, scheme, mimeAttribute: mime || null, mimeHint });
      if (scheme === 'blob:') limitations.add('Blob source observed: it is not transferable to the TV. Blob alone does not establish Media Source Extensions use.');
    };
    add(video.currentSrc, 'currentSrc');
    add(video.getAttribute('src'), 'video-src');
    video.querySelectorAll('source').forEach(source => add(source.getAttribute('src'), 'source-src', source.getAttribute('type')));
    videos.push({
      index, sources, durationSeconds: finite(video.duration), positionSeconds: finite(video.currentTime),
      width: finite(video.videoWidth), height: finite(video.videoHeight), paused: video.paused,
      ended: video.ended, readyState: video.readyState, networkState: video.networkState,
      mediaErrorCode: video.error?.code ?? null, attachedMediaKeys: !!video.mediaKeys,
    });
  }
  limitations.add('Only this permitted document was inspected. Frame contents, other tabs, shadow roots, and private player/network internals were not inspected.');
  limitations.add('Missing media keys does not prove DRM-free content. MIME hints do not identify codecs or guarantee receiver support.');
  limitations.add('Unknown or infinite duration is reported as null; it does not prove a live stream. Refresh after starting the video or changing the page.');
  return {
    version: 1, collectedAt: new Date().toISOString(), scope: 'main-document-only',
    page: { url: document.URL, title: document.title }, videos, candidates: detection.candidates,
    frames: Array.from(document.querySelectorAll('iframe, frame')).map((frame, index) => {
      const src = frame.getAttribute('src');
      let resolved = src;
      try { if (src) resolved = new URL(src, document.baseURI).href; } catch { /* Redactor omits invalid URLs. */ }
      return { index, src: resolved, inspected: false };
    }),
    limitations: [...limitations], exportPrivacy: 'raw-transient',
  };
}
