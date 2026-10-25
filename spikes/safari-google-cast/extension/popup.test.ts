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
      subtitles: [{ url: 'https://example.test/current.vtt?t=subtitle-secret', language: 'en', method: 'track-element', association: 'current-track-element' }],
    } }]);
  const native = vi.fn().mockRejectedValue(new Error('unavailable'));
  vi.stubGlobal('browser', { tabs: { query: vi.fn().mockResolvedValue([{ id: 1 }]) }, scripting: { executeScript }, runtime: { sendNativeMessage: native } });
  document.documentElement.innerHTML = html;
  await import('./popup');
  return { native, executeScript };
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
  await vi.waitFor(() => expect(document.getElementById('status')!.textContent).toContain('Couldn’t inspect'));
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

it('keeps original subtitle tokens private and copies MIME and subtitle only on click', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.querySelector('#subtitles button')).not.toBeNull());
  expect(writeText).not.toHaveBeenCalled();
  expect(document.body.innerHTML).not.toContain('subtitle-secret');
  expect((document.getElementById('report') as HTMLTextAreaElement).value).not.toContain('subtitle-secret');
  (document.querySelector('#subtitles button') as HTMLButtonElement).click();
  expect(writeText).toHaveBeenLastCalledWith('https://example.test/current.vtt?t=subtitle-secret');
  (document.querySelectorAll('#candidates button')[1] as HTMLButtonElement).click();
  expect(writeText).toHaveBeenLastCalledWith('video/mp4');
});

it('clears the previous subtitle buttons when refreshing for another video', async () => {
  const { executeScript } = await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.querySelector('#subtitles button')).not.toBeNull());
  const doc = document.implementation.createHTMLDocument();
  doc.body.innerHTML = '<video src="https://example.test/new.mp4"></video>';
  executeScript.mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
    report: redactReport(collectPageDiagnostics(doc)), originalCandidateUrls: ['https://example.test/new.mp4'], subtitles: [],
  } }]);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('subtitles')!.textContent).toContain('No associated subtitle'));
  expect(document.querySelector('#subtitles button')).toBeNull();
  expect((document.getElementById('original-url') as HTMLTextAreaElement).value).toBe('');
});

it('distinguishes observed-but-unmatched subtitles and redacts diagnostic URLs again', async () => {
  const { executeScript } = await mount();
  const doc = document.implementation.createHTMLDocument();
  executeScript.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
    report: redactReport(collectPageDiagnostics(doc)), originalCandidateUrls: [], subtitles: [],
    subtitleDiagnostics: { currentMediaIdentityCount: 1, resourceEntryCount: 10, trackElementCount: 0, matchedSubtitleCount: 0,
      observedVttUrls: ['https://example.test/old.vtt?t=never-display-this'] },
  } }]);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('subtitles')!.textContent).toContain('could not be associated safely'));
  expect(document.getElementById('subtitle-diagnostics')!.textContent).toContain('1 observed VTT');
  expect((document.getElementById('report') as HTMLTextAreaElement).value).not.toContain('never-display-this');
});

it('copies a combined selected transfer only on click and leaves the diagnostic report redacted', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(false));
  expect(writeText).not.toHaveBeenCalled();
  (document.getElementById('handoff-subtitle') as HTMLSelectElement).value = '0';
  (document.getElementById('handoff-language') as HTMLInputElement).value = 'id';
  (document.getElementById('copy-handoff') as HTMLButtonElement).click();
  expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({
    type: 'universal-vidcaster.handoff', version: 1,
    video: { url: 'https://example.test/clip.mp4?sig=private-value#private-fragment', method: 'direct' },
    subtitle: { url: 'https://example.test/current.vtt?t=subtitle-secret', language: 'id' },
  });
  expect((document.getElementById('report') as HTMLTextAreaElement).value).not.toContain('private-value');
  expect(document.body.innerHTML).not.toContain('subtitle-secret');
});

it('starts focused on transfer with diagnostics collapsed and no inspection or clipboard access', async () => {
  const { executeScript } = await mount();
  expect(executeScript).not.toHaveBeenCalled();
  expect((document.getElementById('diagnostics') as HTMLDetailsElement).open).toBe(false);
  expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(true);
  expect((document.getElementById('handoff-video') as HTMLSelectElement).disabled).toBe(true);
  expect(document.getElementById('language-field')!.hidden).toBe(true);
});

it('shows language only for selected subtitles and blocks invalid language before copying', async () => {
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(false));
  const select = document.getElementById('handoff-subtitle') as HTMLSelectElement;
  select.value = '0'; select.dispatchEvent(new Event('change'));
  expect(document.getElementById('language-field')!.hidden).toBe(false);
  const language = document.getElementById('handoff-language') as HTMLInputElement;
  language.value = 'not a tag'; language.dispatchEvent(new Event('input'));
  expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(true);
  expect(language.getAttribute('aria-invalid')).toBe('true');
  select.value = ''; select.dispatchEvent(new Event('change'));
  expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(false);
  expect(document.getElementById('language-field')!.hidden).toBe(true);
});

it('offers one associated known-language subtitle on the first inspection without watching', async () => {
  const { executeScript } = await mount();
  expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(true);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(false));
  expect((document.getElementById('handoff-subtitle') as HTMLSelectElement).value).toBe('0');
  expect((document.getElementById('handoff-language') as HTMLInputElement).value).toBe('en');
  expect(executeScript).toHaveBeenCalledTimes(2); // Inject + inspect, not watch.
  expect(document.body.innerHTML).not.toContain('subtitle-secret');
  const language = document.getElementById('handoff-language') as HTMLInputElement;
  language.value = 'invalid tag'; language.dispatchEvent(new Event('input'));
  expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(true);
});

it('requires a subtitle choice for ambiguous or unknown-language results and clears old selections', async () => {
  const { executeScript } = await mount();
  const doc = document.implementation.createHTMLDocument('Example');
  doc.body.innerHTML = '<video src="https://media.test/a.mp4"></video>';
  const known = { url: 'https://media.test/en.vtt', language: 'en', method: 'track-element', association: 'current-track-element' };
  for (const subtitles of [[known, { ...known, url: 'https://media.test/id.vtt', language: 'id' }], [{ ...known, language: undefined }], []]) {
    // Replace the pending injection/inspection results on each new scan.
    executeScript.mockReset();
    executeScript.mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
      report: redactReport(collectPageDiagnostics(doc)), originalCandidateUrls: ['https://media.test/a.mp4'], subtitles,
    } }]);
    (document.getElementById('inspect') as HTMLButtonElement).click();
    await vi.waitFor(() => expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(false));
    expect((document.getElementById('handoff-subtitle') as HTMLSelectElement).value).toBe('');
    expect(document.getElementById('language-field')!.hidden).toBe(true);
  }
});
