import type { DiagnosticSnapshot } from './snapshot';

/** Presentation-only helpers: no inspection, clipboard access, or URL storage. */
export function sourceHost(value: string): string {
  try { return new URL(value).hostname; } catch { return 'Unknown source'; }
}
export function mediaLabel(mime?: string): string {
  if (mime?.toLowerCase().includes('mpegurl')) return 'HLS stream';
  if (mime?.toLowerCase() === 'video/mp4') return 'MP4 video';
  return mime ?? 'Type unknown';
}
export function updateTransferView(snapshot?: DiagnosticSnapshot) {
  const video = document.getElementById('handoff-video') as HTMLSelectElement;
  const subtitle = document.getElementById('handoff-subtitle') as HTMLSelectElement;
  const method = document.getElementById('handoff-method') as HTMLSelectElement;
  const language = document.getElementById('handoff-language') as HTMLInputElement;
  const button = document.getElementById('copy-handoff') as HTMLButtonElement;
  video.disabled = !snapshot?.report.candidates.length;
  subtitle.disabled = !snapshot?.subtitles?.length;
  method.disabled = video.disabled;
  document.getElementById('language-field')!.hidden = subtitle.value === '';
  language.disabled = subtitle.value === '';
  const hasVideo = !!snapshot && video.value !== '' && !!snapshot.originalCandidateUrls[Number(video.value)];
  const validLanguage = subtitle.value === '' || /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(language.value.trim());
  language.setAttribute('aria-invalid', String(!validLanguage));
  button.disabled = !hasVideo || !validLanguage;
  const prepared = method.value === 'prepare-on-ipad';
  document.getElementById('method-help')!.textContent = prepared
    ? 'For a signed HLS master link. Keep the iPad app open while casting.'
    : 'For ordinary MP4 or other direct media links. Signed HLS may need Prepare on iPad.';
  document.getElementById('selection-summary')!.textContent = !hasVideo
    ? 'No video selected yet.' : !validLanguage
      ? 'Enter a subtitle language such as en or id.'
      : `${prepared ? 'Prepare on iPad' : 'Direct media'} · ${subtitle.value === '' ? 'No subtitle (replaces any previous subtitle input)' : 'Subtitle included; check it matches this video'}`;
}
