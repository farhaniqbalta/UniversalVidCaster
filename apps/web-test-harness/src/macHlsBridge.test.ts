import { describe, expect, it, vi } from 'vitest';
import { bridgeAddresses, prepareBridgeMedia } from './macHlsBridge';

const address = '192.168.1.10';
const url = `http://${address}:8787/hls/${'a'.repeat(48)}/${'b'.repeat(48)}.m3u8`;
const media = { url: 'https://example.test/master?t=private&pm=browser', mimeType: 'video/mp4', startPositionMs: 12000 };
describe('combined Mac bridge load', () => {
  it('preserves subtitle authorization independently of the bridged video', async () => {
    const subtitle = { url: 'https://subtitle.test/id.vtt?t=different-token&pm=browser', language: 'id' };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url })));
    const prepared = await prepareBridgeMedia({ ...media, subtitle }, address, fetcher);
    expect(prepared.subtitle).toEqual(subtitle);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('subtitle');
  });
  it('prepares the original input and supplies automatic HLS options without losing start position', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url })));
    expect(await prepareBridgeMedia(media, address, fetcher)).toEqual({ ...media, url, mimeType: 'application/vnd.apple.mpegurl', hlsSegmentFormat: 'FMP4' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ url: media.url, address });
  });
  it('requires a selected address before sending a token', async () => {
    const fetcher = vi.fn();
    await expect(prepareBridgeMedia(media, '', fetcher)).rejects.toThrow('Choose');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not echo upstream errors containing private URLs', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(media.url, { status: 400 }));
    await expect(prepareBridgeMedia(media, address, fetcher)).rejects.toThrow('HTTP 400');
    await expect(prepareBridgeMedia(media, address, fetcher)).rejects.not.toThrow('private');
  });
  it('rejects a returned playback URL on an unexpected host', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: url.replace(address, 'other.test') })));
    await expect(prepareBridgeMedia(media, address, fetcher)).rejects.toThrow('invalid playlist');
  });
  it('loads network choices from the local proxy and detects an unavailable bridge', async () => {
    expect(await bridgeAddresses(vi.fn().mockResolvedValue(new Response(JSON.stringify([address]))))).toEqual([address]);
    await expect(bridgeAddresses(vi.fn().mockResolvedValue(new Response('', { status: 502 })))).rejects.toThrow('npm run bridge:hls');
  });
});
