export interface MediaCandidate {
  url: string;
  mimeType?: string;
  title?: string;
  sourcePage?: string;
  startPositionMs?: number;
  hlsSegmentFormat?: 'FMP4';
}

export function validateMedia(media: MediaCandidate): MediaCandidate {
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
  return { ...media, url: url.href, mimeType };
}
