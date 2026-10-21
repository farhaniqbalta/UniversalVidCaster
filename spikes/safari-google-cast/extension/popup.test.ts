/// <reference types="vite/client" />
import { afterEach, expect, it, vi } from 'vitest';
import { collectPageDiagnostics } from '@uvc/detector';
import html from './popup.html?raw';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function mount(failInspection = false) {
  vi.resetModules();
  const doc = document.implementation.createHTMLDocument('Private title');
  doc.body.innerHTML = '<video src="https://example.test/clip.mp4?sig=private-value#private-fragment"></video>';
  const executeScript = failInspection ? vi.fn().mockRejectedValue(new Error('https://secret.test/?token=private-value')) :
    vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: collectPageDiagnostics(doc) }]);
  const native = vi.fn().mockRejectedValue(new Error('unavailable'));
  vi.stubGlobal('browser', { tabs: { query: vi.fn().mockResolvedValue([{ id: 1 }]) }, scripting: { executeScript }, runtime: { sendNativeMessage: native } });
  document.documentElement.innerHTML = html;
  await import('./popup');
  return { native };
}

it('renders and exports redacted data independently of native messaging with clipboard fallback', async () => {
  const { native } = await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect((document.getElementById('copy') as HTMLButtonElement).disabled).toBe(false));
  const report = document.getElementById('report') as HTMLTextAreaElement;
  expect(report.value).toContain('REDACTED');
  expect(document.body.textContent).not.toContain('private-value');
  expect(report.value).not.toContain('private-fragment');
  expect(report.value).not.toContain('Private title');
  expect(native).not.toHaveBeenCalled();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  (document.getElementById('copy') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('copy-status')!.textContent).toContain('selected'));
  expect(report.selectionEnd).toBe(report.value.length);
});

it('reports permission failures without leaking error URLs or leaving an old report', async () => {
  await mount(true);
  (document.getElementById('report') as HTMLTextAreaElement).value = 'old report';
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('status')!.textContent).toContain('Inspection failed'));
  expect(document.body.textContent).not.toContain('private-value');
  expect((document.getElementById('report') as HTMLTextAreaElement).value).toBe('');
  expect((document.getElementById('copy') as HTMLButtonElement).disabled).toBe(true);
  expect((document.getElementById('inspect') as HTMLButtonElement).disabled).toBe(false);
});
