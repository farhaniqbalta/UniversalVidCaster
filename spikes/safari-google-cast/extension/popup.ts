import { redactReport } from '@uvc/detector';
import type { DiagnosticSnapshot } from './snapshot';

declare const browser: {
  tabs: { query(options: object): Promise<{ id?: number }[]> };
  scripting: { executeScript(options: object): Promise<{ result?: DiagnosticSnapshot }[]> };
  runtime: { sendNativeMessage(application: string, message: object): Promise<unknown> };
};
const status = document.getElementById('status')!;
const preview = document.getElementById('report') as HTMLTextAreaElement;
const copy = document.getElementById('copy') as HTMLButtonElement;
const inspect = document.getElementById('inspect') as HTMLButtonElement;
const copyStatus = document.getElementById('copy-status')!;
const originalPanel = document.getElementById('original-panel')!;
const originalField = document.getElementById('original-url') as HTMLTextAreaElement;
const originalStatus = document.getElementById('original-status')!;
let inspectionGeneration = 0;
function clearOriginal() {
  originalPanel.hidden = true; originalField.value = ''; originalStatus.textContent = '';
}
document.getElementById('hide-original')!.onclick = clearOriginal;
copy.onclick = async () => {
  try {
    await navigator.clipboard.writeText(preview.value);
    copyStatus.textContent = 'Redacted report copied. Review it before sharing.';
  } catch {
    preview.focus(); preview.select();
    copyStatus.textContent = 'Clipboard unavailable. The redacted report is selected; use Copy from the selection menu.';
  }
};
const list = (id: string, values: string[]) => {
  const container = document.getElementById(id)!;
  container.replaceChildren(...values.map(value => {
    const item = document.createElement('li'); item.textContent = value; return item;
  }));
};
document.getElementById('inspect')!.onclick = async () => {
  const generation = ++inspectionGeneration;
  inspect.disabled = true;
  clearOriginal();
  preview.value = ''; copy.disabled = true; copyStatus.textContent = '';
  try {
    list('candidates', []); list('limitations', []); list('videos', []);
    status.textContent = 'Inspecting permitted page…';
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab is accessible.');
    const target = { tabId: tab.id };
    await browser.scripting.executeScript({ target, files: ['content.js'] });
    const [snapshot] = await browser.scripting.executeScript({ target, func: () => {
      const scope = globalThis as typeof globalThis & { __uvcSafariProbe?: DiagnosticSnapshot };
      const result = scope.__uvcSafariProbe;
      delete scope.__uvcSafariProbe;
      return result;
    } });
    if (!snapshot?.result) throw new Error('No inspection result was returned.');
    const result = redactReport(snapshot.result.report);
    const candidates = document.getElementById('candidates')!;
    result.candidates.forEach((candidate, index) => {
      const item = document.createElement('li');
      const description = document.createElement('div');
      description.textContent = `${candidate.url} · ${candidate.mimeType ?? 'MIME unknown'}`;
      const original = snapshot.result!.originalCandidateUrls[index];
      const action = document.createElement('button');
      action.type = 'button'; action.textContent = 'Copy original URL';
      action.disabled = !original;
      action.onclick = async () => {
        clearOriginal();
        try {
          // Invoke within this click, preserving clipboard user activation.
          await navigator.clipboard.writeText(original);
          if (generation !== inspectionGeneration) return;
          originalStatus.textContent = 'Original URL copied, including any private query values. Paste only into your local Cast test. The shared report remains redacted.';
        } catch {
          if (generation !== inspectionGeneration) return;
          originalPanel.hidden = false;
          originalField.value = original;
          originalField.focus(); originalField.select();
          originalStatus.textContent = 'Clipboard unavailable. Original URL selected below for manual copying. It may contain private query values; hide it before sharing screenshots.';
        }
      };
      item.append(description, action); candidates.append(item);
    });
    list('limitations', result.limitations);
    list('videos', result.videos.map(video => {
      const sources = video.sources.map(source => `${source.method}: ${source.scheme} ${source.url} (MIME attribute: ${source.mimeAttribute ?? 'unknown'}; hint: ${source.mimeHint ?? 'unknown'})`).join('\n');
      return `Video ${video.index + 1} — ${video.width}×${video.height}\nPosition: ${video.positionSeconds ?? 'unknown'}s / ${video.durationSeconds ?? 'unknown'}s\nPlayback: ${video.paused ? 'paused' : 'not paused'}; ended: ${video.ended}\nReady state: ${video.readyState}; network state: ${video.networkState}\nMedia error: ${video.mediaErrorCode ?? 'none'}; media keys: ${video.attachedMediaKeys ? 'attached' : 'not observed'}\nSources:\n${sources || 'none exposed'}`;
    }));
    preview.value = JSON.stringify(result, null, 2);
    copy.disabled = false;
    status.textContent = `${result.videos.length} video(s), ${result.candidates.length} direct candidate(s), ${result.frames.length} uninspected frame(s). Playback compatibility remains unknown.`;
  } catch { status.textContent = 'Inspection failed. Allow access to this website, use a normal webpage, and retry. Browser-internal and restricted pages may not allow inspection.'; }
  finally { inspect.disabled = false; }
};
document.getElementById('native')!.onclick = async () => {
  try {
    const response = await browser.runtime.sendNativeMessage('ignored.by.safari', { command: 'probe', version: 1 });
    const reply = response as { nativeMessaging?: boolean; castImplemented?: boolean };
    status.textContent = `Native messaging: ${reply?.nativeMessaging === true ? 'confirmed' : 'not confirmed'}. Cast implementation: ${reply?.castImplemented === true ? 'reported' : 'not implemented'}. This is not a playback test.`;
  } catch { status.textContent = 'Native bridge unavailable. Diagnostics work independently of native messaging.'; }
};
