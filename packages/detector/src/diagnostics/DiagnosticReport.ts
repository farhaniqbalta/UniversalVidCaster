import type { DetectedMediaCandidate } from '../DetectionResult';

export interface DiagnosticSource {
  method: 'currentSrc' | 'video-src' | 'source-src';
  url: string;
  scheme: string;
  mimeAttribute: string | null;
  mimeHint: string | null;
}
export interface VideoObservation {
  index: number;
  sources: DiagnosticSource[];
  durationSeconds: number | null;
  positionSeconds: number | null;
  width: number | null;
  height: number | null;
  paused: boolean;
  ended: boolean;
  readyState: number;
  networkState: number;
  mediaErrorCode: number | null;
  attachedMediaKeys: boolean;
}
export interface PageMediaDiagnosticReport {
  version: 1;
  collectedAt: string;
  scope: 'main-document-only';
  page: { url: string; title: string };
  videos: VideoObservation[];
  candidates: DetectedMediaCandidate[];
  frames: { index: number; src: string | null; inspected: false }[];
  limitations: string[];
  exportPrivacy: 'raw-transient' | 'redacted';
}
