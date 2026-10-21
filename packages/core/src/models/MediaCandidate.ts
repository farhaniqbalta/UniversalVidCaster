export interface MediaCandidate {
  url: string;
  mimeType?: string;
  title?: string;
  sourcePage?: string;
  startPositionMs?: number;
  hlsSegmentFormat?: 'FMP4';
  subtitle?: { url: string; language: string };
}

export function validateMedia(media: MediaCandidate): MediaCandidate {
  let subtitle = media.subtitle;
  if (subtitle) {
    let subtitleUrl: URL;
    try { subtitleUrl = new URL(subtitle.url); }
    catch { throw new Error('Provide a valid HTTP(S) WebVTT subtitle URL.'); }
    if (!['https:', 'http:'].includes(subtitleUrl.protocol) || subtitleUrl.username || subtitleUrl.password || /\[REDACTED\]/i.test(decodeURIComponent(subtitleUrl.href))) {
      throw new Error('Use an original HTTP(S) subtitle URL without embedded credentials or redaction placeholders.');
    }
    let language: string;
    try { language = Intl.getCanonicalLocales(subtitle.language.trim())[0]; }
    catch { throw new Error('Provide a valid subtitle language, such as en or id.'); }
    if (!language) throw new Error('Provide a subtitle language, such as en or id.');
    subtitle = { url: subtitleUrl.href, language };
  }
  if (media.hlsSegmentFormat !== undefined && media.hlsSegmentFormat !== 'FMP4') {
    throw new Error('Unsupported HLS segment format hint.');
  }
  const url = new URL(media.url);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use a direct HTTP(S) media URL without embedded credentials.');
  }
  if (media.startPositionMs !== undefined &&
      (!Number.isFinite(media.startPositionMs) || media.startPositionMs < 0)) {
    throw new Error('Start position must be a finite, non-negative number.');
  }
  const inferred = { '.mp4': 'video/mp4', '.m3u8': 'application/x-mpegURL', '.mpd': 'application/dash+xml' };
  const extension = url.pathname.toLowerCase().match(/\.[^.\/]+$/)?.[0];
  const mimeType = media.mimeType?.trim() || inferred[extension as keyof typeof inferred];
  if (!mimeType || !/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)) {
    throw new Error('Provide a valid MIME type for this media URL.');
  }
  if (media.hlsSegmentFormat && !['application/x-mpegurl', 'application/vnd.apple.mpegurl'].includes(mimeType.toLowerCase())) {
    throw new Error('The HLS format hint requires an HLS MIME type.');
  }
  return { ...media, url: url.href, mimeType, ...(subtitle ? { subtitle } : {}) };
}
