export type HandoffMethod = 'direct' | 'prepare-on-ipad';
export function createHandoff(video: { url: string; mimeType?: string }, method: HandoffMethod, subtitle?: { url: string; language: string }): string {
  function original(value: string) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /\[REDACTED\]/i.test(decodeURIComponent(value))) throw new Error('Original media URL required.');
    return value;
  }
  if (!['direct', 'prepare-on-ipad'].includes(method)) throw new Error('Choose a playback method.');
  if (subtitle && !/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(subtitle.language)) throw new Error('Choose a subtitle language.');
  if (method === 'prepare-on-ipad') {
    const url = new URL(video.url);
    if (url.protocol !== 'https:' || !url.searchParams.get('t') || !url.searchParams.get('pm')) throw new Error('Prepare on iPad requires a signed HTTPS master URL.');
  }
  const payload = JSON.stringify({ type: 'universal-vidcaster.handoff', version: 1,
    video: { url: original(video.url), mimeType: video.mimeType, method, startSeconds: 0 },
    ...(subtitle ? { subtitle: { url: original(subtitle.url), language: subtitle.language } } : {}),
  });
  if (payload.length > 32768) throw new Error('Transfer is too large.');
  return payload;
}
