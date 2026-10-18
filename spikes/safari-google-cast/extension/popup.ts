import type { DetectionResult } from '@uvc/detector';

declare const browser: {
  tabs: { query(options: object): Promise<{ id?: number }[]> };
  scripting: { executeScript(options: object): Promise<{ result?: DetectionResult }[]> };
  runtime: { sendNativeMessage(application: string, message: object): Promise<unknown> };
};
const status = document.getElementById('status')!;
const list = (id: string, values: string[]) => {
  const container = document.getElementById(id)!;
  container.replaceChildren(...values.map(value => {
    const item = document.createElement('li'); item.textContent = value; return item;
  }));
};
document.getElementById('inspect')!.onclick = async () => {
  try {
    list('candidates', []); list('limitations', []);
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab is accessible.');
    const target = { tabId: tab.id };
    await browser.scripting.executeScript({ target, files: ['content.js'] });
    const [snapshot] = await browser.scripting.executeScript({ target, func: () => {
      const scope = globalThis as typeof globalThis & { __uvcSafariProbe?: DetectionResult };
      const result = scope.__uvcSafariProbe;
      delete scope.__uvcSafariProbe;
      return result;
    } });
    if (!snapshot?.result) throw new Error('No inspection result was returned.');
    const result = snapshot.result;
    list('candidates', result.candidates.map(candidate => `${candidate.url} · ${candidate.mimeType ?? 'MIME unknown'}`));
    list('limitations', result.limitations);
    status.textContent = `${result.candidates.length} possible sources. Cast support is unproven.`;
  } catch (error) { status.textContent = `Inspection failed: ${String(error)}`; }
};
document.getElementById('native')!.onclick = async () => {
  try {
    const response = await browser.runtime.sendNativeMessage('ignored.by.safari', { command: 'probe', version: 1 });
    status.textContent = `Native response: ${JSON.stringify(response)}. This does not prove Cast support.`;
  } catch (error) { status.textContent = `Native bridge failed: ${String(error)}`; }
};
