import type { MediaCandidate } from '@uvc/core';

export interface DetectionSource {
  videoIndex: number;
  method: 'currentSrc' | 'video-src' | 'source-src';
}
export interface DetectedMediaCandidate extends MediaCandidate {
  sources: DetectionSource[];
}
export interface DetectionResult {
  candidates: DetectedMediaCandidate[];
  limitations: string[];
}
