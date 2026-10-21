import type { MediaCandidate } from '@uvc/core';

export async function bridgeAddresses(fetcher: typeof fetch = fetch): Promise<string[]> {
  const response = await fetcher('/bridge-api/addresses');
  if (!response.ok) throw new Error('Start npm run bridge:hls in another terminal, then retry network addresses.');
  const addresses: unknown = await response.json();
  if (!Array.isArray(addresses) || !addresses.every(address => typeof address === 'string')) {
    throw new Error('Bridge returned invalid network addresses.');
  }
  return addresses;
}

export async function prepareBridgeMedia(media: MediaCandidate, address: string, fetcher: typeof fetch = fetch): Promise<MediaCandidate> {
  if (!address) throw new Error('Choose the Mac address connected to the TV’s network.');
  const response = await fetcher('/bridge-api/sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: media.url, address }),
  });
  if (!response.ok) {
    throw new Error(`Bridge preparation failed (HTTP ${response.status}). Check that the bridge is running and the master URL is fresh with t and pm.`);
  }
  const result = await response.json() as { url?: unknown };
  const url = new URL(typeof result.url === 'string' ? result.url : '');
  if (url.origin !== `http://${address}:8787` || !/^\/hls\/[a-f0-9]{48}\/[a-f0-9]{48}\.m3u8$/.test(url.pathname) || url.search || url.hash) {
    throw new Error('Bridge returned an invalid playlist address.');
  }
  return { ...media, url: url.href, mimeType: 'application/vnd.apple.mpegurl', hlsSegmentFormat: 'FMP4' };
}
