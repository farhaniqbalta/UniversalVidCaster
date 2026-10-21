import { describe, expect, it, vi } from 'vitest';
import { diagnoseHls } from './hlsDiagnostics';

const text = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } });
describe('HLS access diagnostics', () => {
  it('does not propagate parent tokens into child URLs and reports HTTP refusal', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(text('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=10\n/video.json\n')).mockResolvedValueOnce(text('Denied', 401));
    const result = await diagnoseHls('https://example.test/master.json?t=private-token&pm=browser', fetcher);
    expect(fetcher.mock.calls[1][0]).toBe('https://example.test/video.json');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
    expect(result[1]).toMatchObject({ status: 401 });
    expect(JSON.stringify(result)).not.toContain('private-token');
    expect(result[1].observation).toContain('Access refused');
  });
  it('checks both renditions and their map/first segments while never fetching keys', async () => {
    const master = '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI="/audio.json",GROUP-ID="a"\n#EXT-X-STREAM-INF:BANDWIDTH=10\n/video.json\n';
    const media = '#EXTM3U\n#EXT-X-MAP:URI="https://cdn.example.test/init.js"\n#EXT-X-KEY:METHOD=AES-128,URI="/key"\n#EXTINF:6,\nhttps://cdn.example.test/first.webp\n';
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const value = String(url);
      if (value.endsWith('/master')) return text(master);
      if (value.endsWith('.json')) return text(media);
      return new Response(new Uint8Array([0, 0, 0, 8]), { status: 206, headers: { 'Content-Type': 'video/mp4' } });
    });
    const result = await diagnoseHls('https://example.test/master', fetcher);
    expect(fetcher.mock.calls.map(call => String(call[0]))).toEqual([
      'https://example.test/master', 'https://example.test/video.json',
      'https://cdn.example.test/init.js', 'https://cdn.example.test/first.webp', 'https://example.test/audio.json',
    ]);
    expect(result.find(item => item.kind === 'initialization')).toMatchObject({ status: 206, contentType: 'video/mp4' });
    expect(result.some(item => item.observation.includes('Encryption tag present'))).toBe(true);
  });
  it('distinguishes a browser failure from a known HTTP error and redacts URLs', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('https://example.test/a?t=secret-value'));
    const result = await diagnoseHls('https://example.test/a?t=secret-value', fetcher);
    expect(result[0].status).toBeNull();
    expect(result[0].observation).toContain('CORS');
    expect(JSON.stringify(result)).not.toContain('secret-value');
  });
  it('does not mistake JSON response content for an HLS playlist', async () => {
    const fetcher = vi.fn().mockResolvedValue(text('{"stream":"private-value"}'));
    const result = await diagnoseHls('https://example.test/config.json', fetcher);
    expect(result[0].observation).toContain('not identified as an HLS');
    expect(JSON.stringify(result)).not.toContain('private-value');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('rejects redacted, credential-bearing and non-HTTPS input without fetching', async () => {
    const fetcher = vi.fn();
    for (const url of ['https://example.test/?t=%5BREDACTED%5D', 'https://user:pass@example.test/a', 'blob:opaque', 'http://example.test/a']) {
      await expect(diagnoseHls(url, fetcher)).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('skips unsupported child schemes and bounds sampled binary data', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(text('#EXTM3U\n#EXT-X-MAP:URI="file:///private"\n#EXTINF:6,\nhttps://example.test/segment\n')).mockResolvedValueOnce(new Response(new Uint8Array(4096)));
    const result = await diagnoseHls('https://example.test/playlist', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.some(item => item.kind === 'skipped reference')).toBe(true);
    expect(result.find(item => item.kind === 'first segment')?.observation).toContain('1024 bytes');
    expect(fetcher.mock.calls[1][1].headers.Range).toBe('bytes=0-1023');
  });
});
