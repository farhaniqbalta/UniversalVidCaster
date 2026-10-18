import type { MediaCandidate } from '../models/MediaCandidate';
import type { CastReceiverState } from '../models/CastState';

export interface CastSenderAdapter {
  initialize(): Promise<void>;
  subscribe(listener: (state: Partial<CastReceiverState>) => void): () => void;
  /** Invoke synchronously from a user click; the SDK owns device selection. */
  connect(): Promise<void>;
  load(media: MediaCandidate): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  stop(): Promise<void>;
  /** Leave the session while allowing the receiver to keep playing. */
  disconnect(): Promise<void>;
  dispose(): void;
}
