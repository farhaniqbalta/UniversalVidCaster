import { describe, expect, it } from 'vitest';
import { HtmlVideoDetector } from './HtmlVideoDetector';

function page(html: string) {
  const doc = document.implementation.createHTMLDocument('Sample');
  doc.head.innerHTML = '<base href="https://example.test/watch/">';
  doc.title = 'Sample';
  doc.body.innerHTML = html;
  return doc;
}
describe('HtmlVideoDetector', () => {
  it('resolves relative URLs, deduplicates, and retains provenance and MIME', () => {
    const result = new HtmlVideoDetector().detect(page('<video src="clip.mp4"><source src="clip.mp4" type="video/custom"></video>'));
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ url: 'https://example.test/watch/clip.mp4', mimeType: 'video/custom', title: 'Sample' });
    expect(result.candidates[0].sources.map(source => source.method)).toEqual(['video-src', 'source-src']);
  });
  it('puts the active source first and retains only its playback position', () => {
    const doc = page('<video src="fallback.mp4"><source src="active.mp4" type="video/mp4"></video>');
    const video = doc.querySelector('video')!;
    Object.defineProperty(video, 'currentSrc', { value: 'https://example.test/watch/active.mp4' });
    video.currentTime = 2.5;
    const result = new HtmlVideoDetector().detect(doc);
    expect(result.candidates[0]).toMatchObject({ url: video.currentSrc, startPositionMs: 2500 });
    expect(result.candidates[1].startPositionMs).toBeUndefined();
  });
  it('retains extensionless sources for manual MIME entry', () => {
    const result = new HtmlVideoDetector().detect(page('<video src="stream?signature=a%2Bb"></video>'));
    expect(result.candidates[0].url).toBe('https://example.test/watch/stream?signature=a%2Bb');
    expect(result.candidates[0].mimeType).toBeUndefined();
  });
  it.each(['blob:https://example.test/id', 'data:video/mp4,abc', 'mediastream:id', 'ftp://example.test/video.mp4', 'https://user:pass@example.test/a.mp4', 'http://[invalid'])('excludes %s with a reason', src => {
    const doc = page('<video></video>'); doc.querySelector('video')!.setAttribute('src', src);
    const result = new HtmlVideoDetector().detect(doc);
    expect(result.candidates).toHaveLength(0); expect(result.limitations.length).toBeGreaterThan(1);
    expect(result.limitations.join(' ')).not.toContain('user:pass');
  });
  it('reports iframe boundaries and observable media keys without entering frames', () => {
    const doc = page('<video src="movie.mp4"></video><iframe></iframe>');
    Object.defineProperty(doc.querySelector('video'), 'mediaKeys', { value: {} });
    const result = new HtmlVideoDetector().detect(doc);
    expect(result.limitations.join(' ')).toContain('media keys');
    expect(result.limitations.join(' ')).toContain('Frame contents');
    expect(result.candidates).toHaveLength(1);
  });
  it('handles empty pages and missing/blank source attributes', () => {
    for (const html of ['', '<video><source src=" "></video>']) {
      expect(new HtmlVideoDetector().detect(page(html)).candidates).toEqual([]);
    }
  });
});
