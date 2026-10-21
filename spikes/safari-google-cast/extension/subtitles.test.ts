import { expect, it } from 'vitest';
import { collectSubtitles } from './subtitles';

it('finds caption/subtitle track URLs and resource VTT URLs, preserving own queries and deduplicating', () => {
  const doc = document.implementation.createHTMLDocument();
  doc.head.innerHTML = '<base href="https://site.test/watch/">';
  doc.body.innerHTML = '<video><track src="en.vtt?t=own&pm=browser" srclang="en"><track kind="metadata" src="metadata.vtt"><track kind="captions" src="id.vtt" srclang="id"></video>';
  expect(collectSubtitles(doc, [
    { name: 'https://site.test/watch/en.vtt?t=own&pm=browser' },
    { name: 'https://cdn.test/subtitle.vtt?t=other' },
    { name: 'https://cdn.test/script.js' },
    { name: 'blob:https://cdn.test/sub.vtt' },
    { name: 'https://user:pass@cdn.test/sub.vtt' },
  ])).toEqual([
    { url: 'https://site.test/watch/en.vtt?t=own&pm=browser', language: 'en', method: 'track-element' },
    { url: 'https://site.test/watch/id.vtt', language: 'id', method: 'track-element' },
    { url: 'https://cdn.test/subtitle.vtt?t=other', language: null, method: 'resource-timing' },
  ]);
});
