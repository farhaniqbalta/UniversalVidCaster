import type { DiagnosticSnapshot } from './snapshot';

/** Presentation-only helpers: no inspection, clipboard access, or URL storage. */
export function sourceHost(value: string): string {
  try { return new URL(value).hostname; } catch { return 'Unknown source'; }
}
export function mediaLabel(mime?: string): string {
  if (mime?.toLowerCase().includes('mpegurl')) return 'HLS stream';
  if (mime?.toLowerCase() === 'video/mp4') return 'MP4 video';
  return 'Type unknown';
}
export function updateTransferView(snapshot?: DiagnosticSnapshot) {
  const video = document.getElementById('handoff-video') as HTMLSelectElement;
  const subtitle = document.getElementById('handoff-subtitle') as HTMLSelectElement;
  const method = document.getElementById('handoff-method') as HTMLSelectElement;
  const button = document.getElementById('copy-handoff') as HTMLButtonElement;
  video.disabled = !snapshot?.report.candidates.length;
  subtitle.disabled = !snapshot?.subtitles?.length;
  method.disabled = video.disabled;
  const hasVideo = !!snapshot && video.value !== '' && !!snapshot.originalCandidateUrls[Number(video.value)];
  let validMethod = true;
  if (hasVideo && method.value === 'prepare-on-ipad') {
    try {
      const url = new URL(snapshot!.originalCandidateUrls[Number(video.value)]);
      validMethod = url.protocol === 'https:' && !!url.searchParams.get('t') && !!url.searchParams.get('pm');
    } catch { validMethod = false; }
  }
  button.disabled = !hasVideo || !validMethod;
  (document.getElementById('open-app') as HTMLButtonElement).disabled = button.disabled;
  const prepared = method.value === 'prepare-on-ipad';
  if (!validMethod) (document.getElementById('advanced-options') as HTMLDetailsElement).open = true;
  document.getElementById('subtitle-choice')!.hidden = !snapshot?.report.candidates.length || !snapshot.subtitles?.length;
  document.getElementById('subtitle-empty')!.hidden = !snapshot?.report.candidates.length || !!snapshot.subtitles?.length;
  document.getElementById('video-placeholder')!.hidden = !!snapshot?.report.candidates.length;
  const single = snapshot?.report.candidates.length === 1;
  document.getElementById('video-choice')!.hidden = !snapshot || snapshot.report.candidates.length < 2;
  const summary = document.getElementById('video-summary')!;
  summary.hidden = !single;
  summary.textContent = single ? `Video found · ${mediaLabel(snapshot!.report.candidates[0].mimeType)} · ${sourceHost(snapshot!.report.candidates[0].url)}` : '';
  const playbackSummary = document.getElementById('playback-summary')!;
  playbackSummary.hidden = !hasVideo;
  playbackSummary.textContent = `Playback: ${prepared ? 'Prepare on iPad' : 'Direct media'}`;
  document.getElementById('method-help')!.textContent = !validMethod
    ? 'This link does not support preparation. Choose Direct media or select a supported link.'
    : prepared ? 'For the supported signed master link.' : 'Usually best for ordinary media links.';
  const selectionSummary = document.getElementById('selection-summary')!;
  selectionSummary.hidden = !snapshot;
  selectionSummary.textContent = !hasVideo ? 'No video selected yet.' : subtitle.value === ''
    ? 'No subtitles selected.' : 'Check that subtitles match the selected video.';
}
