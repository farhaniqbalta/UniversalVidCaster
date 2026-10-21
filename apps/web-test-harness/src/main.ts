import { CastController, errorMessage, validateMedia } from '@uvc/core';
import { GoogleCastWebAdapter } from '@uvc/cast-web';
import { HtmlVideoDetector } from '@uvc/detector';
import './styles.css';
import { diagnoseHls } from './hlsDiagnostics';
import { bridgeAddresses, prepareBridgeMedia } from './macHlsBridge';

const controller = new CastController(new GoogleCastWebAdapter());
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => element<HTMLInputElement>(id).value;
const button = (id: string) => element<HTMLButtonElement>(id);
const lines: string[] = [];
let preparingBridge = false;
function updateLoadButton() {
  const state = controller.getState();
  button('load').disabled = !state.connected || state.busy || preparingBridge;
}
function log(message: string) {
  lines.push(`${new Date().toLocaleTimeString()}  ${message}`);
  if (lines.length > 100) lines.shift();
  element('logs').textContent = lines.join('\n');
}
function perform(label: string, operation: () => Promise<void>) {
  // Call immediately so connect preserves the click's user activation.
  void operation().then(() => log(`${label}: request completed`))
    .catch(error => {
      element('error').hidden = false;
      element('error').textContent = errorMessage(error);
      log(`${label}: ${errorMessage(error)}`);
    });
}
let lastSummary = '';
controller.subscribe(state => {
  button('connect').disabled = !state.available || state.busy || state.connected;
  button('disconnect').disabled = !state.connected || state.busy;
  updateLoadButton();
  for (const id of ['play', 'pause', 'stop']) button(id).disabled = !state.hasMedia || state.busy;
  button('seek').disabled = !state.hasMedia || !state.canSeek || state.busy;
  element('error').hidden = !state.error;
  element('error').textContent = state.error ?? '';
  element('status').textContent = state.connected ? `Connected to ${state.deviceName ?? 'Cast device'}` :
    state.available ? 'Cast SDK ready. Select a device to connect.' : 'Cast SDK not ready.';
  element('playback').textContent = `Receiver playback: ${state.playback}${state.idleReason ? ` (${state.idleReason})` : ''}`;
  element('timeline').textContent = `${(state.positionMs / 1000).toFixed(1)} / ${(state.durationMs / 1000).toFixed(1)} seconds`;
  const summary = `${state.connected ? 'Connected' : 'Disconnected'} · ${state.playback}${state.idleReason ? ` · ${state.idleReason}` : ''}`;
  if (summary !== lastSummary) { log(summary); lastSummary = summary; }
});
button('connect').onclick = () => perform('Connect', () => controller.connect());
button('disconnect').onclick = () => perform('Disconnect', () => controller.disconnect());
for (const action of ['play', 'pause', 'stop'] as const) {
  button(action).onclick = () => perform(action, () => controller[action]());
}
element<HTMLFormElement>('media-form').onsubmit = event => {
  event.preventDefault();
  if (preparingBridge) return;
  const media = { url: input('url'), mimeType: input('mime'), title: input('title'), startPositionMs: Number(input('start')) * 1000,
    hlsSegmentFormat: element<HTMLInputElement>('hls-fmp4').checked ? 'FMP4' as const : undefined,
    subtitle: input('subtitle-url').trim() ? { url: input('subtitle-url').trim(), language: input('subtitle-language') } : undefined };
  if (input('media-mode') !== 'mac-hls-bridge') {
    perform('Load', () => controller.load(media));
    return;
  }
  preparingBridge = true;
  updateLoadButton();
  const address = input('bridge-address');
  element('bridge-status').textContent = 'Preparing playlist…';
  perform('Bridge load', async () => {
    try {
      validateMedia({ ...media, mimeType: 'application/vnd.apple.mpegurl', hlsSegmentFormat: 'FMP4' });
      const prepared = await prepareBridgeMedia(media, address);
      element('bridge-status').textContent = 'Playlist prepared. Sending to TV…';
      await controller.load(prepared);
      element('bridge-status').textContent = 'Load request completed. Check TV video and audio. Keep the Mac bridge running.';
    } catch (error) {
      element('bridge-status').textContent = 'Could not complete bridge load. Check the error below the connection controls.';
      throw error;
    } finally { preparingBridge = false; updateLoadButton(); }
  });
};
async function refreshBridgeAddresses() {
  button('refresh-bridge').disabled = true;
  const select = element<HTMLSelectElement>('bridge-address');
  const previous = select.value;
  select.replaceChildren();
  element('bridge-status').textContent = 'Checking Mac bridge…';
  try {
    const addresses = await bridgeAddresses();
    if (addresses.length !== 1) select.add(new Option('Choose the Mac’s Wi-Fi / Ethernet address', ''));
    for (const address of addresses) select.add(new Option(address, address));
    if (addresses.includes(previous)) select.value = previous;
    element('bridge-status').textContent = addresses.length ? 'Bridge ready. Confirm the network address, then use Prepare & play.' : 'No network address found. Connect the Mac to the TV’s network, then retry.';
  } catch {
    element('bridge-status').textContent = 'Bridge unavailable. Run npm run bridge:hls in another terminal, then retry network addresses.';
  } finally { button('refresh-bridge').disabled = false; }
}
button('refresh-bridge').onclick = () => { void refreshBridgeAddresses(); };
element<HTMLSelectElement>('media-mode').onchange = () => {
  const bridge = input('media-mode') === 'mac-hls-bridge';
  element('bridge-options').hidden = !bridge;
  element<HTMLInputElement>('mime').disabled = bridge;
  element<HTMLInputElement>('hls-fmp4').disabled = bridge;
  button('load').textContent = bridge ? 'Prepare & play' : 'Load & play';
  if (bridge) void refreshBridgeAddresses();
};
element<HTMLFormElement>('seek-form').onsubmit = event => {
  event.preventDefault(); perform('Seek', () => controller.seek(Number(input('position')) * 1000));
};
window.addEventListener('pagehide', event => { if (!event.persisted) controller.dispose(); });
perform('Initialize', () => controller.initialize());

button('check-hls').onclick = async () => {
  button('check-hls').disabled = true;
  element('hls-results').textContent = 'Checking playlist and listed child URLs…';
  const render = (results: Awaited<ReturnType<typeof diagnoseHls>>) => {
    element('hls-results').textContent = results.map(result => `${result.kind}: HTTP ${result.status ?? 'unknown'}; ${result.contentType ?? 'type unknown'}\n${result.url}\n${result.observation}`).join('\n\n');
  };
  try {
    render(await diagnoseHls(input('url'), fetch, render));
  } catch { element('hls-results').textContent = 'Enter a fresh original HTTPS media URL, without redaction placeholders or embedded credentials.'; }
  finally { button('check-hls').disabled = false; }
};

// Detection is independent of Cast initialization and never starts playback.
button('inspect').onclick = () => {
  const result = new HtmlVideoDetector().detect(document);
  const container = element('candidates');
  container.replaceChildren();
  element('detection-status').textContent = `${result.candidates.length} possible media source(s) found. Playback compatibility is unverified.`;
  for (const candidate of result.candidates) {
    const row = document.createElement('div');
    row.className = 'candidate';
    const details = document.createElement('p');
    details.textContent = `${candidate.url} · ${candidate.mimeType ?? 'MIME unknown — enter manually'} · ${candidate.sources.map(source => `video ${source.videoIndex + 1}: ${source.method}`).join(', ')}`;
    const select = document.createElement('button');
    select.type = 'button'; select.textContent = 'Use this source';
    select.onclick = () => {
      element<HTMLInputElement>('url').value = candidate.url;
      element<HTMLInputElement>('mime').value = candidate.mimeType ?? '';
      element<HTMLInputElement>('title').value = candidate.title ?? '';
      element<HTMLInputElement>('start').value = String((candidate.startPositionMs ?? 0) / 1000);
      element('detection-status').textContent = 'Source selected. Review the form, then use Load & play when connected.';
    };
    row.append(details, select); container.append(row);
  }
  const limitations = element('detection-limitations');
  limitations.replaceChildren();
  for (const reason of result.limitations) {
    const item = document.createElement('li'); item.textContent = reason; limitations.append(item);
  }
};
