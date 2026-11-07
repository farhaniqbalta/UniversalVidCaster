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

async function chooseDirect() {
  await vi.waitFor(() => expect(document.getElementById('status')!.dataset.state).toBe('ready'));
  const method = document.getElementById('handoff-method') as HTMLSelectElement;
  method.value = 'direct'; method.dispatchEvent(new Event('change'));
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
  await chooseDirect();
  expect(writeText).not.toHaveBeenCalled();
  (document.getElementById('handoff-subtitle') as HTMLSelectElement).value = '0';
  (document.getElementById('copy-handoff') as HTMLButtonElement).click();
  expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({
    type: 'universal-vidcaster.handoff', version: 1,
    video: { url: 'https://example.test/clip.mp4?sig=private-value#private-fragment', method: 'direct' },
    subtitle: { url: 'https://example.test/current.vtt?t=subtitle-secret', language: 'en' },
  });
  expect((document.getElementById('report') as HTMLTextAreaElement).value).not.toContain('private-value');
  expect(document.body.innerHTML).not.toContain('subtitle-secret');
});

it('starts focused on transfer with diagnostics collapsed and no inspection or clipboard access', async () => {
  const { executeScript } = await mount();
  expect(executeScript).not.toHaveBeenCalled();
  expect((document.getElementById('advanced-options') as HTMLDetailsElement).open).toBe(false);
  expect(document.getElementById('advanced-options')!.contains(document.getElementById('handoff-method'))).toBe(true);
  expect(document.getElementById('advanced-options')!.contains(document.getElementById('watch-subtitles'))).toBe(true);
  expect(document.getElementById('advanced-options')!.contains(document.getElementById('stop-subtitle-watch'))).toBe(true);
  expect((document.getElementById('diagnostics') as HTMLDetailsElement).open).toBe(false);
  expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(true);
  expect((document.getElementById('handoff-video') as HTMLSelectElement).disabled).toBe(true);
  expect(document.getElementById('handoff-language')).toBeNull();
  expect((document.getElementById('handoff-method') as HTMLSelectElement).value).toBe('prepare-on-ipad');
});

it('requires a video choice and copies the exact selected candidate without an unproven subtitle', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const { executeScript } = await mount();
  const doc = document.implementation.createHTMLDocument();
  doc.body.innerHTML = '<video src="https://media.test/one.mp4?token=one"></video><video src="https://media.test/two.mp4?token=two"></video>';
  const report = collectPageDiagnostics(doc);
  executeScript.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
    report: redactReport(report), originalCandidateUrls: report.candidates.map(candidate => candidate.url),
    subtitles: [{ url: 'https://media.test/sub.vtt?token=secret', language: 'en', method: 'track-element', association: 'current-track-element' }],
  } }]);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('status')!.textContent).toContain('2 videos'));
  const video = document.getElementById('handoff-video') as HTMLSelectElement;
  expect(video.value).toBe('');
  expect((document.getElementById('handoff-subtitle') as HTMLSelectElement).value).toBe('');
  expect((document.getElementById('copy-handoff') as HTMLButtonElement).disabled).toBe(true);
  video.value = '1'; video.dispatchEvent(new Event('change'));
  await chooseDirect();
  (document.getElementById('copy-handoff') as HTMLButtonElement).click();
  expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({ video: { url: 'https://media.test/two.mp4?token=two', method: 'direct' } });
  expect(JSON.parse(writeText.mock.calls[0][0])).not.toHaveProperty('subtitle');
  expect(document.body.innerHTML).not.toContain('token=two');
});

it('defaults to preparation and explains unsupported links', async () => {
  const { executeScript } = await mount();
  const doc = document.implementation.createHTMLDocument();
  doc.body.innerHTML = '<video src="https://media.test/master.json?t=secret&amp;pm=browser"></video>';
  const report = collectPageDiagnostics(doc);
  executeScript.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
    report: redactReport(report), originalCandidateUrls: report.candidates.map(candidate => candidate.url), subtitles: [],
  } }]);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(false));
  expect((document.getElementById('handoff-method') as HTMLSelectElement).value).toBe('prepare-on-ipad');
  expect(document.getElementById('playback-summary')!.textContent).toContain('Prepare on iPad');
  const method = document.getElementById('handoff-method') as HTMLSelectElement;
  method.value = 'direct'; method.dispatchEvent(new Event('change'));
  expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(false);

  const other = document.implementation.createHTMLDocument();
  other.body.innerHTML = '<video src="https://media.test/movie.mp4"></video>';
  const otherReport = collectPageDiagnostics(other);
  executeScript.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
    report: redactReport(otherReport), originalCandidateUrls: otherReport.candidates.map(candidate => candidate.url), subtitles: [],
  } }]);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('status')!.dataset.state).toBe('ready'));
  expect(method.value).toBe('prepare-on-ipad');
  expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(true);
  expect((document.getElementById('advanced-options') as HTMLDetailsElement).open).toBe(true);
  expect(document.getElementById('method-help')!.textContent).toContain('Choose Direct');

  method.value = 'direct'; method.dispatchEvent(new Event('change'));
  expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(false);

  const ambiguous = document.implementation.createHTMLDocument();
  ambiguous.body.innerHTML = '<video src="https://media.test/stream.m3u8?t=secret&amp;pm=browser"></video>';
  const ambiguousReport = collectPageDiagnostics(ambiguous);
  executeScript.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: {
    report: redactReport(ambiguousReport), originalCandidateUrls: ambiguousReport.candidates.map(candidate => candidate.url), subtitles: [],
  } }]);
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await vi.waitFor(() => expect((document.getElementById('open-app') as HTMLButtonElement).disabled).toBe(false));
  expect(method.value).toBe('prepare-on-ipad');
});

it('keeps a known subtitle language without asking for input', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const { executeScript } = await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await chooseDirect();
  expect((document.getElementById('handoff-subtitle') as HTMLSelectElement).value).toBe('0');
  expect(document.getElementById('handoff-language')).toBeNull();
  expect(executeScript).toHaveBeenCalledTimes(2);
  (document.getElementById('copy-handoff') as HTMLButtonElement).click();
  expect(JSON.parse(writeText.mock.calls[0][0]).subtitle.language).toBe('en');
});

it('requests the app link synchronously with the selected private transfer', async () => {
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await chooseDirect();
  const assign = vi.fn();
  vi.stubGlobal('window', { location: { assign } });
  (document.getElementById('open-app') as HTMLButtonElement).click();
  expect(assign).toHaveBeenCalledOnce();
  const link = new URL(assign.mock.calls[0][0]);
  expect(link.protocol).toBe('universalvidcaster:');
  const payload = JSON.parse(decodeURIComponent(link.hash.slice(1)));
  expect(payload.video.url).toBe('https://example.test/clip.mp4?sig=private-value#private-fragment');
  expect(payload.subtitle.language).toBe('en');
  expect(document.body.innerHTML).not.toContain('private-value');
});

it('requires a subtitle choice for ambiguous or unknown-language results and clears old selections', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
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
    await chooseDirect();
    expect((document.getElementById('handoff-subtitle') as HTMLSelectElement).value).toBe('');
    if (subtitles.length === 1 && !subtitles[0].language) {
      const select = document.getElementById('handoff-subtitle') as HTMLSelectElement;
      select.value = '0'; select.dispatchEvent(new Event('change'));
      (document.getElementById('copy-handoff') as HTMLButtonElement).click();
      expect(JSON.parse(writeText.mock.calls.at(-1)![0]).subtitle.language).toBe('und');
    }
  }
});

it('starts and stops subtitle watching only on explicit clicks', async () => {
  const { executeScript } = await mount();
  expect(executeScript).not.toHaveBeenCalled();
  executeScript.mockReset().mockResolvedValue([]);
  (document.getElementById('watch-subtitles') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('subtitle-watch-status')!.textContent).toContain('5 minutes'));
  expect(executeScript).toHaveBeenCalledTimes(1);
  expect(executeScript.mock.calls[0][0].func).toBeInstanceOf(Function);
  (document.getElementById('stop-subtitle-watch') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById('subtitle-watch-status')!.textContent).toContain('stopped'));
  expect(executeScript).toHaveBeenCalledTimes(2);
});

it('uses a five minute subtitle observer and disconnects it on stop', async () => {
  const { executeScript } = await mount();
  executeScript.mockReset().mockResolvedValue([]);
  (document.getElementById('watch-subtitles') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(executeScript).toHaveBeenCalledTimes(1));
  (document.getElementById('stop-subtitle-watch') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(executeScript).toHaveBeenCalledTimes(2));
  const observe = vi.fn(); const disconnect = vi.fn();
  const timer = vi.fn().mockReturnValue(17); const clear = vi.fn();
  vi.stubGlobal('PerformanceObserver', class { observe = observe; disconnect = disconnect; });
  vi.stubGlobal('setTimeout', timer); vi.stubGlobal('clearTimeout', clear);
  executeScript.mock.calls[0][0].func();
  expect(observe).toHaveBeenCalledWith({ type: 'resource', buffered: false });
  expect(timer).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
  executeScript.mock.calls[1][0].func();
  expect(disconnect).toHaveBeenCalled();
  expect(clear).toHaveBeenCalledWith(17);
});

it('clears the private transfer after a clipboard failure and dismissal', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  await mount();
  (document.getElementById('inspect') as HTMLButtonElement).click();
  await chooseDirect();
  (document.getElementById('copy-handoff') as HTMLButtonElement).click();
  const field = document.getElementById('original-url') as HTMLTextAreaElement;
  await vi.waitFor(() => expect(field.value).toContain('private-value'));
  expect(document.getElementById('original-panel')!.hidden).toBe(false);
  expect((document.getElementById('report') as HTMLTextAreaElement).value).not.toContain('private-value');
  (document.getElementById('hide-original') as HTMLButtonElement).click();
  expect(field.value).toBe('');
  expect(document.getElementById('original-panel')!.hidden).toBe(true);
});
