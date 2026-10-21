import { describe, expect, it } from 'vitest';
import { validateMedia } from './MediaCandidate';

describe('media validation', () => {
  it('preserves a signed subtitle URL and canonicalizes its language', () => {
    const subtitle = { url: 'https://example.test/a.vtt?t=own%2Btoken&pm=browser', language: 'en-us' };
    expect(validateMedia({ url: 'https://example.test/a.mp4', subtitle }).subtitle).toEqual({ ...subtitle, language: 'en-US' });
  });
  it.each(['blob:https://example.test/a', 'https://user:pass@example.test/a.vtt', 'https://example.test/a.vtt?t=%5BREDACTED%5D', 'invalid'])('rejects invalid subtitle URLs without echoing secrets: %s', url => {
    expect(() => validateMedia({ url: 'https://example.test/a.mp4', subtitle: { url, language: 'en' } })).toThrow(/subtitle|WebVTT/);
  });
  it.each(['', 'not_a_language'])('requires a valid subtitle language: %s', language => {
    expect(() => validateMedia({ url: 'https://example.test/a.mp4', subtitle: { url: 'https://example.test/a.vtt', language } })).toThrow(/language/);
  });
  it('rejects an HLS format hint on ordinary MP4 and preserves it on HLS', () => {
    expect(() => validateMedia({ url: 'https://example.test/a.mp4', hlsSegmentFormat: 'FMP4' })).toThrow('HLS MIME');
    expect(validateMedia({ url: 'https://example.test/a.m3u8', hlsSegmentFormat: 'FMP4' }).hlsSegmentFormat).toBe('FMP4');
  });
  it.each(['blob:https://site.test/id', 'file:///video.mp4', 'ftp://site.test/a.mp4', 'https://user:pass@site.test/a.mp4'])('rejects %s', url => {
    expect(() => validateMedia({ url })).toThrow();
  });
  it('infers MIME without modifying signed query parameters', () => {
    const url = 'https://example.test/movie.mp4?signature=a%2Bb&expires=10';
    expect(validateMedia({ url })).toMatchObject({ url, mimeType: 'video/mp4' });
  });
  it('requires MIME for extensionless URLs', () => {
    expect(() => validateMedia({ url: 'https://example.test/stream' })).toThrow('MIME');
    expect(validateMedia({ url: 'https://example.test/stream', mimeType: 'video/mp4' }).mimeType).toBe('video/mp4');
  });
  it.each([-1, NaN, Infinity])('rejects invalid start %s', startPositionMs => {
    expect(() => validateMedia({ url: 'https://example.test/a.mp4', startPositionMs })).toThrow();
  });
});
