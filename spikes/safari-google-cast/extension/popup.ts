import { redactReport, redactDiagnosticUrl } from '@uvc/detector';
import type { DiagnosticSnapshot } from './snapshot';
import { createHandoff, type HandoffMethod } from './handoff';

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
let handoffSnapshot: DiagnosticSnapshot | undefined;
const handoffVideo = document.getElementById('handoff-video') as HTMLSelectElement;
const handoffSubtitle = document.getElementById('handoff-subtitle') as HTMLSelectElement;
document.getElementById('copy-handoff')!.onclick = async () => {
  const label = document.getElementById('handoff-status')!;
  const generation = inspectionGeneration;
  try {
    const snapshot = handoffSnapshot;
    if (!snapshot || handoffVideo.value === '') throw new Error();
    const index = Number(handoffVideo.value);
    const subtitle = handoffSubtitle.value === '' ? undefined : snapshot.subtitles?.[Number(handoffSubtitle.value)];
    const payload = createHandoff({ url: snapshot.originalCandidateUrls[index], mimeType: snapshot.report.candidates[index].mimeType },
      (document.getElementById('handoff-method') as HTMLSelectElement).value as HandoffMethod,
      subtitle ? { url: subtitle.url, language: (document.getElementById('handoff-language') as HTMLInputElement).value.trim() } : undefined);
    clearOriginal();
    try {
      await navigator.clipboard.writeText(payload);
      if (generation === inspectionGeneration) label.textContent = 'Transfer copied. Open the app and tap Paste Safari transfer. Contains private links; do not share.';
    } catch {
      if (generation !== inspectionGeneration) return;
      originalPanel.hidden = false; originalField.value = payload; originalField.focus(); originalField.select();
      label.textContent = 'Clipboard unavailable. Transfer selected below; copy manually, then hide and clear it.';
    }
  } catch { label.textContent = 'Check selected video, playback method, and subtitle language. Prepare on iPad needs an original HTTPS master with t and pm.'; }
};
function clearOriginal() {
  originalPanel.hidden = true; originalField.value = ''; originalStatus.textContent = '';
}
document.getElementById('hide-original')!.onclick = clearOriginal;
async function copyValue(value: string, generation: number, label: string) {
  clearOriginal();
  try {
    await navigator.clipboard.writeText(value);
    if (generation !== inspectionGeneration) return;
    originalStatus.textContent = `${label} copied. Use original URLs locally; the report stays redacted.`;
  } catch {
    if (generation !== inspectionGeneration) return;
    originalPanel.hidden = false; originalField.value = value;
    originalField.focus(); originalField.select();
    originalStatus.textContent = 'Clipboard unavailable. Value selected for manual copying; hide it before sharing screenshots.';
  }
}
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
  handoffSnapshot = undefined;
  handoffVideo.replaceChildren(); handoffSubtitle.replaceChildren(new Option('No subtitle', ''));
  (document.getElementById('copy-handoff') as HTMLButtonElement).disabled = true;
  document.getElementById('handoff-status')!.textContent = '';
  preview.value = ''; copy.disabled = true; copyStatus.textContent = '';
  try {
    list('candidates', []); list('limitations', []); list('videos', []); list('subtitles', []);
    document.getElementById('subtitle-diagnostics')!.textContent = '';
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
    handoffSnapshot = snapshot.result;
    if (result.candidates.length !== 1) handoffVideo.add(new Option('Choose a video', ''));
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
      handoffVideo.add(new Option(`Video ${index + 1} · ${candidate.mimeType ?? 'MIME unknown'}`, String(index)));
      const mime = document.createElement('button');
      mime.type = 'button'; mime.textContent = 'Copy MIME type'; mime.disabled = !candidate.mimeType;
      mime.onclick = () => copyValue(candidate.mimeType!, generation, 'MIME type');
      item.append(mime);
    });
    const subtitles = snapshot.result.subtitles ?? [];
    const safeSubtitles = subtitles.map(subtitle => ({ ...subtitle, url: redactDiagnosticUrl(subtitle.url) }));
    const subtitleList = document.getElementById('subtitles')!;
    safeSubtitles.forEach((subtitle, index) => {
      handoffSubtitle.add(new Option(`Subtitle ${index + 1} · ${subtitle.language ?? 'choose language below'} · ${subtitle.url}`, String(index)));
      const row = document.createElement('li');
      const label = document.createElement('div');
      label.textContent = `${subtitle.url} · ${subtitle.language ?? 'language unknown'} · ${subtitle.association}`;
      const action = document.createElement('button'); action.type = 'button'; action.textContent = 'Copy subtitle URL';
      action.onclick = () => copyValue(subtitles[index].url, generation, 'Subtitle URL');
      row.append(label, action); subtitleList.append(row);
    });
    (document.getElementById('copy-handoff') as HTMLButtonElement).disabled = !result.candidates.length;
    const diagnostics = snapshot.result.subtitleDiagnostics;
    if (diagnostics) {
      document.getElementById('subtitle-diagnostics')!.textContent = `${diagnostics.trackElementCount} track element(s), ${diagnostics.observedVttUrls.length} observed VTT URL(s), ${diagnostics.currentMediaIdentityCount} current media ID(s), ${subtitles.length} match(es).`;
    }
    if (!subtitles.length) list('subtitles', [diagnostics?.observedVttUrls.length
      ? 'Subtitle URLs were observed, but could not be associated safely with this video. The redacted report includes their paths for diagnosis.'
      : 'No associated subtitle found. Click Watch new subtitle requests, close this popup, switch subtitles off/on in the player, then reopen and Inspect / Refresh page.']);
    list('limitations', result.limitations);
    list('videos', result.videos.map(video => {
      const sources = video.sources.map(source => `${source.method}: ${source.scheme} ${source.url} (MIME attribute: ${source.mimeAttribute ?? 'unknown'}; hint: ${source.mimeHint ?? 'unknown'})`).join('\n');
      return `Video ${video.index + 1} — ${video.width}×${video.height}\nPosition: ${video.positionSeconds ?? 'unknown'}s / ${video.durationSeconds ?? 'unknown'}s\nPlayback: ${video.paused ? 'paused' : 'not paused'}; ended: ${video.ended}\nReady state: ${video.readyState}; network state: ${video.networkState}\nMedia error: ${video.mediaErrorCode ?? 'none'}; media keys: ${video.attachedMediaKeys ? 'attached' : 'not observed'}\nSources:\n${sources || 'none exposed'}`;
    }));
    const safeDiagnostics = diagnostics ? { ...diagnostics, observedVttUrls: diagnostics.observedVttUrls.map(redactDiagnosticUrl) } : undefined;
    preview.value = JSON.stringify({ ...result, subtitleObservations: safeSubtitles, subtitleDiagnostics: safeDiagnostics }, null, 2);
    copy.disabled = false;
    status.textContent = `${result.videos.length} video(s), ${result.candidates.length} direct candidate(s), ${result.frames.length} uninspected frame(s). Playback compatibility remains unknown.`;
  } catch { status.textContent = 'Inspection failed. Allow access to this website, use a normal webpage, and retry. Browser-internal and restricted pages may not allow inspection.'; }
  finally { inspect.disabled = false; }
};
document.getElementById('watch-subtitles')!.onclick = async () => {
  const label = document.getElementById('subtitle-watch-status')!;
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error();
    await browser.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
      const scope = globalThis as typeof globalThis & { __uvcSubtitleWatch?: {
        entries: { name: string; startTime: number }[]; observer: PerformanceObserver; timer: number;
      } };
      const previous = scope.__uvcSubtitleWatch;
      previous?.observer.disconnect(); if (previous) clearTimeout(previous.timer);
      const entries: { name: string; startTime: number }[] = [];
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          try {
            const url = new URL(entry.name);
            if (!/^https?:$/.test(url.protocol) || !(/\.vtt$/i.test(url.pathname) || /^\/v\/[^/]+\//.test(url.pathname))) continue;
            entries.push({ name: entry.name, startTime: entry.startTime });
            if (entries.length > 512) entries.shift();
          } catch { /* Ignore non-URL resources. */ }
        }
      });
      observer.observe({ type: 'resource', buffered: false });
      const timer = setTimeout(() => { observer.disconnect(); delete scope.__uvcSubtitleWatch; }, 5 * 60 * 1000);
      scope.__uvcSubtitleWatch = { entries, observer, timer };
    } });
    label.textContent = 'Watching this tab for up to 5 minutes. Close popup, switch subtitles off/on, then reopen and inspect. A full page reload ends this watch; start it again after reload.';
  } catch { label.textContent = 'Could not start watching. Allow website access and retry.'; }
};
document.getElementById('stop-subtitle-watch')!.onclick = async () => {
  const label = document.getElementById('subtitle-watch-status')!;
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error();
    await browser.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
      const scope = globalThis as typeof globalThis & { __uvcSubtitleWatch?: { observer: PerformanceObserver; timer: number } };
      const watch = scope.__uvcSubtitleWatch;
      watch?.observer.disconnect(); if (watch) clearTimeout(watch.timer);
      delete scope.__uvcSubtitleWatch;
    } });
    label.textContent = 'Watch stopped and captured entries cleared. Inspect again to refresh results.';
  } catch { label.textContent = 'Could not stop watch in this tab. It expires automatically after 5 minutes.'; }
};
document.getElementById('native')!.onclick = async () => {
  try {
    const response = await browser.runtime.sendNativeMessage('ignored.by.safari', { command: 'probe', version: 1 });
    const reply = response as { nativeMessaging?: boolean; castImplemented?: boolean };
    status.textContent = `Native messaging: ${reply?.nativeMessaging === true ? 'confirmed' : 'not confirmed'}. Cast implementation: ${reply?.castImplemented === true ? 'reported' : 'not implemented'}. This is not a playback test.`;
  } catch { status.textContent = 'Native bridge unavailable. Diagnostics work independently of native messaging.'; }
};
