import { describe, expect, it } from 'vitest';
import { validateMedia } from './MediaCandidate';

describe('media validation', () => {
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
