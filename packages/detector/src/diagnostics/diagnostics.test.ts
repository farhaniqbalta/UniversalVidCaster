import { describe, expect, it } from 'vitest';
import { collectPageDiagnostics } from './collectPageDiagnostics';
import { redactDiagnosticUrl, redactReport } from './redactReport';

function page(html: string) {
  const doc = document.implementation.createHTMLDocument('Private page title');
  doc.head.insertAdjacentHTML('beforeend', '<base href="https://example.test/watch/">');
  doc.body.innerHTML = html;
  return doc;
}
describe('diagnostic collection', () => {
  it('records MIME attributes separately from hints and normalizes media numbers', () => {
    const doc = page('<video src="movie.mp4"><source src="stream.m3u8" type="application/custom"></video>');
    const video = doc.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: Infinity });
    Object.defineProperty(video, 'currentTime', { value: NaN });
    Object.defineProperty(video, 'videoWidth', { value: 1920 });
    Object.defineProperty(video, 'videoHeight', { value: 1080 });
    Object.defineProperty(video, 'error', { value: { code: 3 } });
    const result = collectPageDiagnostics(doc);
    expect(result.videos[0]).toMatchObject({ durationSeconds: null, positionSeconds: null, width: 1920, height: 1080, mediaErrorCode: 3 });
    expect(result.videos[0].sources[1]).toMatchObject({ mimeAttribute: 'application/custom', mimeHint: 'application/x-mpegURL' });
    expect(result.candidates).toHaveLength(2);
    expect(result.scope).toBe('main-document-only');
    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
  });
  it('records blob and media keys without claiming MSE or DRM certainty', () => {
    const doc = page('<video src="blob:https://example.test/private-id"></video><iframe src="embed?secret=one"></iframe>');
    Object.defineProperty(doc.querySelector('video'), 'mediaKeys', { value: {} });
    const result = collectPageDiagnostics(doc);
    expect(result.videos[0].sources[0].scheme).toBe('blob:');
    expect(result.videos[0].attachedMediaKeys).toBe(true);
    expect(result.candidates).toEqual([]);
    expect(result.frames[0]).toMatchObject({ inspected: false, src: 'https://example.test/watch/embed?secret=one' });
    expect(result.limitations.join(' ')).toContain('Blob alone does not establish');
  });
  it('refreshes currentSrc and active playback observations', () => {
    const doc = page('<video></video>');
    const video = doc.querySelector('video')!;
    expect(collectPageDiagnostics(doc).candidates).toEqual([]);
    Object.defineProperty(video, 'currentSrc', { value: 'https://example.test/new.mpd' });
    video.currentTime = 1.25;
    expect(collectPageDiagnostics(doc).videos[0]).toMatchObject({ positionSeconds: 1.25, sources: [{ method: 'currentSrc', mimeHint: 'application/dash+xml' }] });
  });
  it('handles empty pages and invalid and blank sources', () => {
    const doc = page('<video><source src=" "><source src="http://[invalid"></video>');
    const result = collectPageDiagnostics(doc);
    expect(result.videos[0].sources[0].scheme).toBe('invalid');
    expect(result.candidates).toEqual([]);
    expect(collectPageDiagnostics(page('')).videos).toEqual([]);
  });
  it('preserves duplicate provenance and resolves relative sources', () => {
    const result = collectPageDiagnostics(page('<video src="clip.mp4"><source src="clip.mp4" type="video/mp4"></video>'));
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].sources).toHaveLength(2);
    expect(result.videos[0].sources[0].url).toBe('https://example.test/watch/clip.mp4');
  });
});

describe('diagnostic export privacy', () => {
  it('redacts page, candidate, sourcePage, observations, frames, titles without mutating raw data', () => {
    const doc = page('<video title="Sensitive title" src="clip.mp4?sig=source-secret#source-fragment"></video><iframe src="https://user:password@example.test/embed?token=frame-secret#frame-fragment"></iframe>');
    const raw = collectPageDiagnostics(doc);
    raw.page.url = 'https://user:password@example.test/page?key=page-secret#page-fragment';
    raw.candidates[0].sourcePage = 'https://example.test/watch?key=sourcepage-secret#sourcepage-fragment';
    const before = JSON.stringify(raw);
    const safe = redactReport(raw);
    const exported = JSON.stringify(safe);
    for (const secret of ['source-secret', 'source-fragment', 'password', 'frame-secret', 'frame-fragment', 'page-secret', 'page-fragment', 'sourcepage-secret', 'sourcepage-fragment', 'Sensitive title', 'Private page title']) {
      expect(exported).not.toContain(secret);
    }
    expect(exported).toContain('REDACTED');
    expect(safe.exportPrivacy).toBe('redacted');
    expect(JSON.stringify(raw)).toBe(before);
    expect(redactReport(safe)).toEqual(safe);
  });
  it.each(['blob:https://example.test/hidden-id', 'data:video/mp4,hidden-id', 'mediastream:hidden-id', 'http://[hidden-id'])('omits opaque/invalid source contents: %s', url => {
    const safe = redactDiagnosticUrl(url);
    expect(safe).not.toContain('hidden-id');
    expect(redactDiagnosticUrl(safe)).toBe(safe);
  });
  it('preserves blob scheme explanations through both report redaction passes', () => {
    const raw = collectPageDiagnostics(page('<video src="blob:https://example.test/private-id"></video>'));
    const safe = redactReport(raw);
    expect(safe.videos[0].sources[0].url).toBe('[blob: source omitted]');
    expect(redactReport(safe)).toEqual(safe);
  });
  it('preserves duplicate query names while redacting every value', () => {
    const value = new URL(redactDiagnosticUrl('https://example.test/a?key=one&key=two&empty=#private'));
    expect(value.searchParams.getAll('key')).toEqual(['[REDACTED]', '[REDACTED]']);
    expect(value.searchParams.get('empty')).toBe('[REDACTED]');
    expect(value.hash).toBe('');
  });
});
