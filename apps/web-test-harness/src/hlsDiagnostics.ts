import { redactDiagnosticUrl } from '@uvc/detector';

export interface HlsResourceCheck {
  kind: string;
  url: string;
  status: number | null;
  contentType: string | null;
  observation: string;
}

/** Bounded, user-triggered access checks. Never rewrites URLs or transfers cookies. */
export async function diagnoseHls(raw: string, fetcher: typeof fetch = fetch, onProgress?: (checks: HlsResourceCheck[]) => void): Promise<HlsResourceCheck[]> {
  const checks: HlsResourceCheck[] = [];
  const publish = () => onProgress?.(checks.map(check => ({ ...check })));
  let count = 0;
  const visited = new Set<string>();
  const safeURL = (text: string, base?: string) => {
    const url = new URL(text, base);
    if (url.protocol !== 'https:' || url.username || url.password ||
        (url.href.includes('REDACTED'))) throw new Error('Use an original HTTPS URL without embedded credentials.');
    return url.href;
  };
  const initial = safeURL(raw.trim());

  async function read(url: string, kind: string, playlist: boolean): Promise<string | null> {
    if (count >= 9 || visited.has(url)) return null;
    visited.add(url); count++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let item: HlsResourceCheck | undefined;
    try {
      const response = await fetcher(url, {
        credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
        cache: 'no-store', signal: controller.signal,
        headers: playlist ? {} : { Range: 'bytes=0-1023' },
      });
      item = {
        kind, url: redactDiagnosticUrl(url), status: response.status,
        contentType: response.headers.get('Content-Type'), observation: '',
      };
      checks.push(item);
      if (!response.ok) {
        item.observation = [401, 403].includes(response.status) ? 'Access refused for this exact URL without cookies or a referrer.' : 'HTTP request failed.';
        await response.body?.cancel(); return null;
      }
      const reader = response.body?.getReader();
      if (!reader) { item.observation = 'No readable response body.'; return null; }
      const limit = playlist ? 512 * 1024 : 1024;
      const chunks: Uint8Array[] = [];
      let size = 0, oversized = false;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          const available = limit - size;
          chunks.push(part.value.subarray(0, available));
          size += Math.min(part.value.length, available);
          if (size >= limit) { oversized = playlist; break; }
        }
      } finally { await reader.cancel(); }
      if (!playlist) {
        item.observation = `HTTP access succeeded; sampled ${size} bytes. Media validity/TV access not established.`;
        return null;
      }
      if (oversized) { item.observation = 'Playlist exceeds the diagnostic size limit; not parsed.'; return null; }
      const data = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
      const text = new TextDecoder().decode(data).trimStart();
      if (!text.startsWith('#EXTM3U')) { item.observation = 'Response is not identified as an HLS playlist.'; return null; }
      item.observation = text.includes('#EXT-X-STREAM-INF:') ? 'HLS master playlist.' : 'HLS media playlist.';
      if (text.includes('#EXT-X-KEY:')) item.observation += ' Encryption tag present; no keys requested.';
      if (text.includes('#EXT-X-MAP:')) item.observation += ' Initialization resource declared; fragmented MP4 is a possibility.';
      return text;
    } catch {
      if (item) item.observation = 'HTTP response received, but body reading failed or timed out.';
      else checks.push({ kind, url: redactDiagnosticUrl(url), status: null, contentType: null,
        observation: 'Browser could not complete/read this request: CORS, redirect, network, or timeout. HTTP status unknown.' });
      return null;
    } finally { clearTimeout(timer); publish(); }
  }

  function resolve(text: string, base: string): string | null {
    try { return safeURL(text, base); }
    catch {
      checks.push({ kind: 'skipped reference', url: '[reference omitted]', status: null, contentType: null, observation: 'Reference is not an eligible HTTPS URL.' });
      publish();
      return null;
    }
  }
  async function inspectMedia(url: string, body?: string) {
    const text = body ?? await read(url, 'media playlist', true);
    if (!text) return;
    const map = text.match(/^#EXT-X-MAP:.*?URI="([^"]+)"/m)?.[1];
    const segment = text.split(/\r?\n/).find(line => line.trim() && !line.trim().startsWith('#'))?.trim();
    for (const [kind, reference] of [['initialization', map], ['first segment', segment]]) {
      if (reference) { const target = resolve(reference, url); if (target) await read(target, kind!, false); }
    }
  }
  const master = await read(initial, 'input playlist', true);
  if (!master) return checks;
  if (!master.includes('#EXT-X-STREAM-INF:')) { await inspectMedia(initial, master); return checks; }
  const video = master.match(/^#EXT-X-STREAM-INF:[^\r\n]*\r?\n([^#\r\n][^\r\n]*)/m)?.[1]?.trim();
  const audio = master.split(/\r?\n/).find(line => line.startsWith('#EXT-X-MEDIA:') && /TYPE=AUDIO(?:,|$)/.test(line))?.match(/URI="([^"]+)"/)?.[1];
  for (const reference of [video, audio]) {
    if (reference) { const target = resolve(reference, initial); if (target) await inspectMedia(target); }
  }
  return checks;
}
