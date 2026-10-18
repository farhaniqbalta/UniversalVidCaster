import { initialState, errorMessage, type CastReceiverState, type CastState } from '../models/CastState';
import { validateMedia, type MediaCandidate } from '../models/MediaCandidate';
import type { CastSenderAdapter } from '../transport/CastSenderAdapter';

export class CastController {
  private disposed = false;
  private state: CastState = { ...initialState };
  private listeners = new Set<(state: Readonly<CastState>) => void>();
  private unsubscribe: () => void;
  constructor(private adapter: CastSenderAdapter) {
    this.unsubscribe = adapter.subscribe(update => this.receive(update));
  }
  getState(): Readonly<CastState> { return { ...this.state }; }
  subscribe(listener: (state: Readonly<CastState>) => void): () => void {
    if (this.disposed) throw new Error("Cast controller is disposed.");
    this.listeners.add(listener);
    listener(this.getState());
    return () => { this.listeners.delete(listener); };
  }
  private receive(update: Partial<CastReceiverState>) {
    // Enforce ownership even for adapters implemented in untyped JavaScript.
    const { busy: _busy, error: _error, ...receiver } = update as Partial<CastState>;
    this.update(receiver);
  }
  private update(update: Partial<CastState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...update };
    if (!this.state.connected) {
      Object.assign(this.state, { deviceName: undefined, playback: 'UNKNOWN', positionMs: 0,
        durationMs: 0, canSeek: false, hasMedia: false, idleReason: undefined });
    }
    for (const listener of this.listeners) listener(this.getState());
  }
  private async run(action: () => Promise<void>): Promise<void> {
    if (this.disposed) throw new Error("Cast controller is disposed.");
    if (this.state.busy) throw new Error('Another Cast operation is in progress.');
    this.update({ busy: true, error: undefined });
    try { await action(); }
    catch (error) { this.update({ error: errorMessage(error) }); throw error; }
    finally { this.update({ busy: false }); }
  }
  private requireSession() {
    if (!this.state.connected) throw new Error('Connect to a Cast device first.');
  }
  private requireMedia() {
    this.requireSession();
    if (!this.state.hasMedia) throw new Error('Load media first.');
  }
  initialize() { return this.run(() => this.adapter.initialize()); }
  connect() { return this.run(() => {
    if (!this.state.available) throw new Error('Cast SDK is unavailable.');
    return this.adapter.connect();
  }); }
  load(media: MediaCandidate) { return this.run(() => {
    this.requireSession(); return this.adapter.load(validateMedia(media));
  }); }
  play() { return this.run(() => { this.requireMedia(); return this.adapter.play(); }); }
  pause() { return this.run(() => { this.requireMedia(); return this.adapter.pause(); }); }
  stop() { return this.run(() => { this.requireMedia(); return this.adapter.stop(); }); }
  seek(positionMs: number) { return this.run(() => {
    this.requireMedia();
    if (!this.state.canSeek || !Number.isFinite(positionMs) || positionMs < 0 ||
        (this.state.durationMs > 0 && positionMs > this.state.durationMs)) {
      throw new Error('Seek position is invalid or this stream cannot seek.');
    }
    return this.adapter.seek(positionMs);
  }); }
  disconnect() { return this.run(() => { this.requireSession(); return this.adapter.disconnect(); }); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe(); this.listeners.clear(); this.adapter.dispose();
  }
}
