/// <reference types="vite/client" />
import { afterEach, expect, it, vi } from 'vitest';
import { collectPageDiagnostics, redactReport } from '@uvc/detector';
import html from './popup.html?raw';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function mount(failInspection = false) {
  vi.resetModules();
  const doc = document.implementation.createHTMLDocument('Private title');
  doc.body.innerHTML = '<video src="https://example.test/clip.mp4?sig=private-value#private-fragment"></video>';
  const executeScript = failInspection ? vi.fn().mockRejectedValue(new Error('https://secret.test/?token=private-value')) :
    vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
      report: redactReport(collectPageDiagnostics(doc)),
      originalCandidateUrls: collectPageDiagnostics(doc).candidates.map(candidate => candidate.url),
    } }]);
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

it('copies the exact candidate only on user click, keeping preview and report copy redacted', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.querySelector('#candidates button')).not.toBeNull());
  expect(writeText).not.toHaveBeenCalled();
  expect(document.body.innerHTML).not.toContain('private-value');
  (document.querySelector('#candidates button') as HTMLButtonElement).click();
  expect(writeText).toHaveBeenCalledWith('https://example.test/clip.mp4?sig=private-value#private-fragment');
  await vi.waitFor(() => expect(document.getElementById('original-status')!.textContent).toContain('Original URL copied'));
  const report = (document.getElementById('report') as HTMLTextAreaElement).value;
  expect(report).not.toContain('private-value');
  expect(document.body.innerHTML).not.toContain('private-value');
  (document.getElementById('copy') as HTMLButtonElement).click();
  expect(writeText).toHaveBeenLastCalledWith(report);
});

it('reveals original only after explicit copy fails and supports clearing it', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.querySelector('#candidates button')).not.toBeNull());
  const field = document.getElementById('original-url') as HTMLTextAreaElement;
  expect(field.value).toBe('');
  expect(document.getElementById('original-panel')!.hidden).toBe(true);
  (document.querySelector('#candidates button') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(field.value).toContain('private-value'));
  expect(document.getElementById('original-panel')!.hidden).toBe(false);
  expect(field.selectionEnd).toBe(field.value.length);
  expect((document.getElementById('report') as HTMLTextAreaElement).value).not.toContain('private-value');
  (document.getElementById('hide-original') as HTMLButtonElement).click();
  expect(field.value).toBe('');
  expect(document.getElementById('original-panel')!.hidden).toBe(true);
});
