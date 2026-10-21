export function originalUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || /\[REDACTED\]/i.test(decodeURIComponent(url.href))) {
    throw new Error('Use an original HTTPS URL without embedded credentials.');
  }
  url.hash = '';
  return url;
}

export function rewritePlaylist(text, base, authorization, playlistUrl) {
  if (!text.trimStart().startsWith('#EXTM3U')) throw new Error('Upstream response is not an HLS playlist.');
  if (/^#EXT-X-(?:SESSION-)?KEY:(?!.*METHOD=NONE(?:,|$))/m.test(text)) {
    throw new Error('Encrypted playlists are outside this experiment.');
  }
  if (text.includes('{$')) throw new Error('HLS variable substitution is not supported.');
  const master = /^#EXT-X-STREAM-INF:/m.test(text);
  function resolve(reference, playlist) {
    const url = originalUrl(new URL(reference, base).href);
    for (const key of ['t', 'pm']) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, authorization[key]);
    }
    return playlist ? playlistUrl(url.href) : url.href;
  }
  return text.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (!trimmed.startsWith('#')) return resolve(trimmed, master);
    const playlist = /^#EXT-X-(?:MEDIA|I-FRAME-STREAM-INF|RENDITION-REPORT):/.test(trimmed);
    return line.replace(/URI="([^"]*)"/g, (_, uri) => `URI="${resolve(uri, playlist)}"`);
  }).join('\n');
}
