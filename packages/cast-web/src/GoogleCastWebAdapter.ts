/// <reference types="chromecast-caf-sender" />
import { type CastState, type CastReceiverState, type CastSenderAdapter, type MediaCandidate } from '@uvc/core';
import { loadCastSdk } from './loadCastSdk';

export class GoogleCastWebAdapter implements CastSenderAdapter {
  private context?: cast.framework.CastContext;
  private player?: cast.framework.RemotePlayer;
  private remote?: cast.framework.RemotePlayerController;
  private listeners = new Set<(state: Partial<CastReceiverState>) => void>();
  private disposed = false;
  // Operation busy/error state belongs to the controller, not receiver events.
  private snapshot: Partial<CastReceiverState> = {
    available: false, connected: false, playback: 'UNKNOWN', positionMs: 0,
    durationMs: 0, canSeek: false, hasMedia: false,
  };
  constructor(private loadSdk: () => Promise<void> = loadCastSdk) {}
  subscribe(listener: (state: Partial<CastReceiverState>) => void) {
    this.listeners.add(listener); listener({ ...this.snapshot });
    return () => { this.listeners.delete(listener); };
  }
  private emit(state: Partial<CastReceiverState>) {
    this.snapshot = { ...this.snapshot, ...state };
    for (const listener of this.listeners) listener({ ...this.snapshot });
  }
  async initialize() {
    if (this.context) return;
    await this.loadSdk();
    if (this.disposed) return;
    this.context = cast.framework.CastContext.getInstance();
    this.context.setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    this.player = new cast.framework.RemotePlayer();
    this.remote = new cast.framework.RemotePlayerController(this.player);
    this.context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, this.sync);
    this.context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, this.sync);
    this.remote.addEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, this.sync);
    this.sync();
  }
  private sync = () => {
    const session = this.context?.getCurrentSession();
    const sessionState = session?.getSessionState();
    const connected = !!session && (sessionState === cast.framework.SessionState.SESSION_STARTED ||
      sessionState === cast.framework.SessionState.SESSION_RESUMED);
    const media = connected ? session?.getMediaSession() : undefined;
    const raw = media?.playerState;
    const playback = ['IDLE', 'BUFFERING', 'PLAYING', 'PAUSED'].includes(raw ?? '')
      ? raw as CastState['playback'] : 'UNKNOWN';
    this.emit({
      available: true, connected,
      deviceName: connected ? session?.getCastDevice().friendlyName : undefined,
      playback, hasMedia: !!media && raw !== 'IDLE',
      positionMs: connected ? (this.player?.currentTime ?? 0) * 1000 : 0,
      durationMs: connected ? (this.player?.duration ?? 0) * 1000 : 0,
      canSeek: connected && !!this.player?.canSeek,
      idleReason: media?.idleReason ?? undefined,
    });
  };
  connect(): Promise<void> {
    if (!this.context) return Promise.reject(new Error('Initialize the Cast SDK first.'));
    // No await before requestSession: retain the browser user activation.
    return this.context.requestSession().then(() => { this.sync(); });
  }
  private session() {
    const session = this.context?.getCurrentSession();
    if (!session || !this.snapshot.connected) throw new Error('No active Cast session.');
    return session;
  }
  async load(media: MediaCandidate) {
    const session = this.session();
    const info = new chrome.cast.media.MediaInfo(media.url, media.mimeType!);
    if (media.hlsSegmentFormat === 'FMP4') {
      // Official sender properties are absent from the installed declaration version.
      const hlsInfo = info as typeof info & { hlsSegmentFormat?: string; hlsVideoSegmentFormat?: string };
      const formats = chrome.cast.media as typeof chrome.cast.media & {
        HlsSegmentFormat?: { FMP4: string }; HlsVideoSegmentFormat?: { FMP4: string };
      };
      if (!formats.HlsSegmentFormat?.FMP4 || !formats.HlsVideoSegmentFormat?.FMP4) {
        throw new Error('This Cast SDK runtime does not expose HLS fragmented MP4 format options.');
      }
      hlsInfo.hlsSegmentFormat = formats.HlsSegmentFormat.FMP4;
      hlsInfo.hlsVideoSegmentFormat = formats.HlsVideoSegmentFormat.FMP4;
    }
    const metadata = new chrome.cast.media.GenericMediaMetadata();
    metadata.title = media.title ?? 'Direct video';
    info.metadata = metadata;
    const request = new chrome.cast.media.LoadRequest(info);
    request.autoplay = true;
    request.currentTime = (media.startPositionMs ?? 0) / 1000;
    await session.loadMedia(request);
    this.sync();
  }
  private mediaCommand(command: 'play' | 'pause' | 'stop'): Promise<void> {
    const media = this.session().getMediaSession();
    if (!media) return Promise.reject(new Error('No receiver media session.'));
    return new Promise((resolve, reject) => {
      if (command === 'play') media.play(new chrome.cast.media.PlayRequest(), resolve, reject);
      else if (command === 'pause') media.pause(new chrome.cast.media.PauseRequest(), resolve, reject);
      else media.stop(new chrome.cast.media.StopRequest(), resolve, reject);
    });
  }
  play() { return this.mediaCommand('play'); }
  pause() { return this.mediaCommand('pause'); }
  stop() { return this.mediaCommand('stop'); }
  seek(positionMs: number): Promise<void> {
    const media = this.session().getMediaSession();
    if (!media) return Promise.reject(new Error('No receiver media session.'));
    const request = new chrome.cast.media.SeekRequest();
    request.currentTime = positionMs / 1000;
    return new Promise((resolve, reject) => media.seek(request, resolve, reject));
  }
  async disconnect() {
    this.session().endSession(false);
    // The SDK's session-state event confirms disconnection.
  }
  dispose() {
    this.disposed = true;
    this.context?.removeEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, this.sync);
    this.context?.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, this.sync);
    this.remote?.removeEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, this.sync);
    this.listeners.clear();
  }
}
