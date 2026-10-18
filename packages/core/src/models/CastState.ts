export interface CastState {
  available: boolean;
  connected: boolean;
  deviceName?: string;
  playback: 'UNKNOWN' | 'IDLE' | 'BUFFERING' | 'PLAYING' | 'PAUSED';
  positionMs: number;
  durationMs: number;
  canSeek: boolean;
  hasMedia: boolean;
  idleReason?: string;
  error?: string;
  busy: boolean;
}
export const initialState: CastState = {
  available: false, connected: false, playback: 'UNKNOWN', positionMs: 0,
  durationMs: 0, canSeek: false, hasMedia: false, busy: false,
};
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'code' in error) return String(error.code);
  return String(error ?? 'Unknown Cast error');
}

/** State owned by the sender integration; operation state stays in the controller. */
export type CastReceiverState = Omit<CastState, "busy" | "error">;
