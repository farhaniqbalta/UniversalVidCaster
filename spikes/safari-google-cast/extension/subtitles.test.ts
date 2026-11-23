import { describe, expect, it, vi } from 'vitest';
import { collectSubtitles, subtitleDiagnostics } from './subtitles';

const media = (id: string) => `https://media.test/v/z6/${id}/config.json?t=secret&pm=browser`;
const caption = (id: string) => `https://media.test/v/z6/${id}/i18n/en/test.vtt?t=caption-secret&pm=browser`;
const flatMedia = (id: string) => `https://media.test/v/${id}/config-123.json?t=example&pm=browser`;
const flatCaption = (id: string) => `https://media.test/v/${id}/subs-legacy/example.vtt?t=caption-example&pm=browser`;

it('matches flat media IDs to subs-legacy captions and reports a current identity', () => {
  const doc = document.implementation.createHTMLDocument();
  const resources = [{ name: flatMedia('current'), startTime: 1 }, { name: flatCaption('current'), startTime: 2 }];
  const subtitles = collectSubtitles(doc, [flatMedia('current')], resources);
  expect(subtitles.map(subtitle => subtitle.url)).toEqual([flatCaption('current')]);
  expect(subtitleDiagnostics(doc, [flatMedia('current')], resources, subtitles)).toMatchObject({ currentMediaIdentityCount: 1, matchedSubtitleCount: 1 });
});

it('keeps previous flat video captions out and detects flat playback transitions', () => {
  const doc = document.implementation.createHTMLDocument();
  const resources = [{ name: flatCaption('previous') }, { name: flatCaption('current') }];
  expect(collectSubtitles(doc, [flatMedia('current')], resources).map(item => item.url)).toEqual([flatCaption('current')]);
  expect(collectSubtitles(doc, [flatMedia('previous')], [
    { name: flatMedia('previous'), startTime: 1 }, { name: flatMedia('current'), startTime: 2 },
    { name: flatCaption('previous'), startTime: 3 },
  ])).toEqual([]);
});

it('keeps flat and namespaced layouts distinct even when their IDs overlap', () => {
  const doc = document.implementation.createHTMLDocument();
  expect(collectSubtitles(doc, [media('current')], [{ name: flatCaption('current') }])).toEqual([]);
  expect(collectSubtitles(doc, [flatMedia('current')], [{ name: caption('current') }])).toEqual([]);
});

it('excludes video one subtitles when the same document switches to video two', () => {
  const doc = document.implementation.createHTMLDocument();
  const history = [{ name: caption('one') }, { name: caption('two') }];
  expect(collectSubtitles(doc, [media('one')], history).map(item => item.url)).toEqual([caption('one')]);
  expect(collectSubtitles(doc, [media('two')], history).map(item => item.url)).toEqual([caption('two')]);
  expect(collectSubtitles(doc, [media('two')], [{ name: caption('one') }])).toEqual([]);
});
it('does not select arbitrary latest VTT without a current media identity', () => {
  const doc = document.implementation.createHTMLDocument();
  expect(collectSubtitles(doc, [], [{ name: caption('one') }])).toEqual([]);
  expect(collectSubtitles(doc, [media('one'), media('two')], [{ name: caption('one') }])).toEqual([]);
  expect(collectSubtitles(doc, [media('two')], [{ name: 'https://cdn.test/previous.vtt' }])).toEqual([]);
});
it('rejects an old DOM source when newer playback belongs to another video', () => {
  const doc = document.implementation.createHTMLDocument();
  expect(collectSubtitles(doc, [media('one')], [
    { name: media('one'), startTime: 1 }, { name: caption('one'), startTime: 2 },
    { name: media('two'), startTime: 3 },
  ])).toEqual([]);
});
it('collects current DOM tracks and rejects identifiable mismatches, metadata and credentials', () => {
  const doc = document.implementation.createHTMLDocument();
  doc.body.innerHTML = `<video><track src="${caption('one')}"><track src="${caption('two')}" srclang="en"><track kind="metadata" src="https://cdn.test/meta.vtt"><track src="https://user:pass@cdn.test/sub.vtt"></video>`;
  const result = collectSubtitles(doc, [media('two')], [{ name: caption('two') }]);
  expect(result).toEqual([{ url: caption('two'), language: 'en', method: 'track-element', association: 'matching-media-id' }]);
});

it('reports missing requests separately from observed-but-unmatched requests', () => {
  const doc = document.implementation.createHTMLDocument();
  const missing = subtitleDiagnostics(doc, [media('two')], [], []);
  expect(missing.currentMediaIdentityCount).toBe(1);
  expect(missing.observedVttUrls).toEqual([]);
  const unmatched = subtitleDiagnostics(doc, [media('two')], [{ name: caption('one') }], []);
  expect(unmatched.observedVttUrls).toEqual([caption('one')]);
  expect(unmatched.matchedSubtitleCount).toBe(0);
});

describe('ensureSubtitleWatch', () => {
  it('keeps subtitle requests through long playback and installs one observer', async () => {
    const { ensureSubtitleWatch } = await import('./subtitles');
    const observers: { callback: (list: { getEntries(): { name: string; startTime: number }[] }) => void; options?: object }[] = [];
    vi.stubGlobal('PerformanceObserver', class {
      constructor(public callback: (list: { getEntries(): { name: string; startTime: number }[] }) => void) { observers.push(this as never); }
      observe(options: object) { observers.at(-1)!.options = options; }
      disconnect() {}
    });
    const scope = {};
    const watch = ensureSubtitleWatch(scope);
    expect(ensureSubtitleWatch(scope)).toBe(watch);
    expect(observers).toHaveLength(1);
    expect(observers[0].options).toEqual({ type: 'resource', buffered: true });
    const segments = Array.from({ length: 600 }, (_, index) => ({ name: `https://cdn.test/v/abc/p/seg${index}.m4s`, startTime: index + 2 }));
    observers[0].callback({ getEntries: () => [{ name: 'https://cdn.test/v/abc/subs/en.vtt', startTime: 1 }, ...segments, { name: 'not a url', startTime: 0 }] });
    expect(watch.vtt.map(entry => entry.name)).toEqual(['https://cdn.test/v/abc/subs/en.vtt']);
    expect(watch.media).toHaveLength(50);
    expect(watch.media.at(-1)!.name).toContain('seg599');
    vi.unstubAllGlobals();
  });
});
