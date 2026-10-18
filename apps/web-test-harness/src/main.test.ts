import html from '../index.html?raw';
import { expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ load: vi.fn(async () => {}), connect: vi.fn(async () => {}) }));
vi.mock('@uvc/cast-web', () => ({
  GoogleCastWebAdapter: class {
    subscribe(listener: (state: object) => void) {
      listener({ available: false, connected: false }); return () => {};
    }
    async initialize() { throw new Error('Cast unavailable in test'); }
    load = calls.load;
    connect = calls.connect;
    dispose() {}
  },
}));

it('inspects and selects safely without Cast availability or automatically loading', async () => {
  document.documentElement.innerHTML = html;
  await import('./main');
  await Promise.resolve();
  const field = (id: string) => document.getElementById(id) as HTMLInputElement;
  const fixture = document.getElementById('sample-video') as HTMLVideoElement;
  fixture.title = '<img src=x onerror=alert(1)>';
  (document.getElementById('inspect') as HTMLButtonElement).click();
  expect(document.getElementById('candidates')!.textContent).toContain('flower.mp4');
  expect(document.getElementById('candidates')!.textContent).toContain('source-src');
  const select = document.querySelector<HTMLButtonElement>('#candidates button')!;
  expect(select.disabled).toBe(false);
  select.click();
  expect(field('url').value).toContain('flower.mp4');
  expect(field('mime').value).toBe('video/mp4');
  expect(field('title').value).toBe(fixture.title);
  expect(document.querySelector('#candidates img')).toBeNull();
  expect(calls.connect).not.toHaveBeenCalled(); expect(calls.load).not.toHaveBeenCalled();
  fixture.remove();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  expect(document.getElementById('detection-status')!.textContent).toContain('0 possible');
  field('url').value = 'https://example.test/manual.mp4';
  expect(field('url').disabled).toBe(false);
  expect(field('url').value).toBe('https://example.test/manual.mp4');
});
