import { expect, it } from 'vitest';
import { createHandoff } from './handoff';
it('bundles original video and independently authorized subtitle without report redaction', () => {
  const video = { url: 'https://media.test/master.json?t=video%2Btoken&pm=browser', mimeType: 'application/vnd.apple.mpegurl' };
  const subtitle = { url: 'https://sub.test/a.vtt?t=other%2Btoken&pm=browser', language: 'id' };
  const payload = JSON.parse(createHandoff(video, 'prepare-on-ipad', subtitle));
  expect(payload).toMatchObject({ type: 'universal-vidcaster.handoff', version: 1, video: { ...video, method: 'prepare-on-ipad', startSeconds: 0 }, subtitle });
  expect(JSON.parse(createHandoff({ url: 'https://media.test/a.mp4' }, 'direct'))).not.toHaveProperty('subtitle');
});
it('rejects redacted inputs, credential URLs and unsigned preparation requests', () => {
  for (const url of ['https://media.test/a?t=%5BREDACTED%5D', 'https://user:pass@media.test/a', 'blob:https://media.test/id']) {
    expect(() => createHandoff({ url }, 'direct')).toThrow();
  }
  expect(() => createHandoff({ url: 'https://media.test/a.m3u8' }, 'prepare-on-ipad')).toThrow();
});

it('encodes an explicit app link without changing original authorization or Unicode', async () => {
  const { createAppLink } = await import('./handoff');
  const payload = createHandoff({ url: 'https://media.test/日本.mp4?t=a%2Bb&pm=browser#fragment' }, 'direct',
    { url: 'https://sub.test/en.vtt?t=own%2Ftoken', language: 'en' });
  const link = new URL(createAppLink(payload));
  expect(link.protocol).toBe('universalvidcaster:');
  expect(link.hostname).toBe('import');
  expect(link.search).toBe('');
  expect(decodeURIComponent(link.hash.slice(1))).toBe(payload);
  expect(() => createAppLink('x'.repeat(32769))).toThrow();
});
