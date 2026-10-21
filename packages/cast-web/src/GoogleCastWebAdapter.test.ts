import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleCastWebAdapter } from './GoogleCastWebAdapter';
import type { CastState } from '@uvc/core';

function setup() {
  const contextListeners = new Map<string, () => void>();
  const remoteListeners = new Map<string, () => void>();
  const media = {
    playerState: 'PLAYING', idleReason: null as string | null,
    play: vi.fn((_request, success) => success()),
    pause: vi.fn((_request, success) => success()),
    stop: vi.fn((_request, success) => success()),
    seek: vi.fn((_request, success) => success()),
  };
  let connected = false;
  const session = {
    getSessionState: () => 'SESSION_STARTED',
    getCastDevice: () => ({ friendlyName: 'Living room' }),
    getMediaSession: () => media,
    loadMedia: vi.fn(async () => {}), endSession: vi.fn(),
  };
  const context = {
    setOptions: vi.fn(),
    getCurrentSession: () => connected ? session : null,
    requestSession: vi.fn(async () => { connected = true; }),
    addEventListener: (name: string, cb: () => void) => contextListeners.set(name, cb),
    removeEventListener: (name: string) => contextListeners.delete(name),
  };
  class Player { currentTime = 2; duration = 5; canSeek = true; }
  class Remote {
    addEventListener(name: string, cb: () => void) { remoteListeners.set(name, cb); }
    removeEventListener(name: string) { remoteListeners.delete(name); }
  }
  class MediaInfo { constructor(public contentId: string, public contentType: string) {} }
  class LoadRequest { constructor(public media: unknown) {} }
  class Track { constructor(public trackId: number, public type: string) {} }
  class Request {}
  vi.stubGlobal('cast', { framework: {
    CastContext: { getInstance: () => context }, RemotePlayer: Player, RemotePlayerController: Remote,
    CastContextEventType: { SESSION_STATE_CHANGED: 'session', CAST_STATE_CHANGED: 'cast' },
    RemotePlayerEventType: { ANY_CHANGE: 'change' },
    SessionState: { SESSION_STARTED: 'SESSION_STARTED', SESSION_RESUMED: 'SESSION_RESUMED' },
  } });
  vi.stubGlobal('chrome', { cast: { AutoJoinPolicy: { ORIGIN_SCOPED: 'origin' }, media: {
    DEFAULT_MEDIA_RECEIVER_APP_ID: 'DEFAULT', MediaInfo, LoadRequest,
    Track, TrackType: { TEXT: 'TEXT' }, TextTrackType: { SUBTITLES: 'SUBTITLES' },
    HlsSegmentFormat: { FMP4: 'fmp4' }, HlsVideoSegmentFormat: { FMP4: 'fmp4' },
    GenericMediaMetadata: Request, PlayRequest: Request, PauseRequest: Request, StopRequest: Request, SeekRequest: Request,
  } } });
  const adapter = new GoogleCastWebAdapter(async () => {});
  let state: Partial<CastState> = {};
  adapter.subscribe(update => { state = update; });
  return { adapter, context, session, media, contextListeners, remoteListeners,
    state: () => state, disconnect: () => { connected = false; contextListeners.get('session')!(); } };
}
afterEach(() => vi.unstubAllGlobals());
describe('GoogleCastWebAdapter', () => {
  it('loads and activates an external WebVTT track with its own signed URL', async () => {
    const test = setup(); await test.adapter.initialize(); await test.adapter.connect();
    const url = 'https://subtitle.test/en.vtt?t=subtitle-own-token&pm=browser';
    await test.adapter.load({ url: 'https://video.test/master.m3u8', mimeType: 'application/vnd.apple.mpegurl', subtitle: { url, language: 'en' } });
    expect(test.session.loadMedia).toHaveBeenCalledWith(expect.objectContaining({
      activeTrackIds: [1], media: expect.objectContaining({ tracks: [expect.objectContaining({
        trackId: 1, type: 'TEXT', trackContentId: url, trackContentType: 'text/vtt', subtype: 'SUBTITLES', language: 'en',
      })] }),
    }));
    await test.adapter.load({ url: 'https://video.test/movie.mp4', mimeType: 'video/mp4' });
    const last = test.session.loadMedia.mock.calls.at(-1) as unknown as [{ activeTrackIds?: number[]; media: { tracks?: unknown[] } }];
    expect(last[0].activeTrackIds).toBeUndefined();
    expect(last[0].media.tracks).toBeUndefined();
  });
  it('sends explicit audio/video format hints for an HLS fragmented MP4 request', async () => {
    const test = setup(); await test.adapter.initialize(); await test.adapter.connect();
    await test.adapter.load({ url: 'https://example.test/master.json', mimeType: 'application/vnd.apple.mpegurl', hlsSegmentFormat: 'FMP4' });
    expect(test.session.loadMedia).toHaveBeenCalledWith(expect.objectContaining({
      media: expect.objectContaining({ hlsSegmentFormat: 'fmp4', hlsVideoSegmentFormat: 'fmp4' }),
    }));
  });
  it('uses SDK chooser and maps receiver state including external disconnect', async () => {
    const test = setup(); await test.adapter.initialize();
    expect(test.state()).toMatchObject({ connected: false, playback: 'UNKNOWN' });
    await test.adapter.connect();
    expect(test.state()).not.toHaveProperty('busy');
    expect(test.context.requestSession).toHaveBeenCalledOnce();
    expect(test.state()).toMatchObject({ connected: true, deviceName: 'Living room', playback: 'PLAYING', positionMs: 2000 });
    test.media.playerState = 'PAUSED'; test.remoteListeners.get('change')!();
    expect(test.state().playback).toBe('PAUSED');
    test.disconnect(); expect(test.state()).toMatchObject({ connected: false, hasMedia: false, positionMs: 0 });
  });
  it('converts milliseconds and supplies media metadata', async () => {
    const test = setup(); await test.adapter.initialize(); await test.adapter.connect();
    await test.adapter.load({ url: 'https://example.test/flower.mp4', mimeType: 'video/mp4', title: 'Flower', startPositionMs: 1500 });
    expect(test.session.loadMedia).toHaveBeenCalledWith(expect.objectContaining({
      currentTime: 1.5, autoplay: true,
      media: expect.objectContaining({ contentType: 'video/mp4', metadata: expect.objectContaining({ title: 'Flower' }) }),
    }));
    await test.adapter.seek(3000);
    expect(test.media.seek).toHaveBeenCalledWith(expect.objectContaining({ currentTime: 3 }), expect.any(Function), expect.any(Function));
  });
  it('propagates receiver control failures', async () => {
    const test = setup(); await test.adapter.initialize(); await test.adapter.connect();
    test.media.pause.mockImplementation((_request, _success, ...rest: unknown[]) => {
      (rest[0] as (error: unknown) => void)({ code: 'session_error' });
    });
    await expect(test.adapter.pause()).rejects.toEqual({ code: 'session_error' });
  });
  it('leaves playback running on disconnect and removes all listeners on dispose', async () => {
    const test = setup(); await test.adapter.initialize(); await test.adapter.connect();
    await test.adapter.disconnect(); expect(test.session.endSession).toHaveBeenCalledWith(false);
    test.adapter.dispose(); expect(test.contextListeners.size).toBe(0); expect(test.remoteListeners.size).toBe(0);
  });
  it('exposes receiver idle errors without claiming active playback', async () => {
    const test = setup(); await test.adapter.initialize(); await test.adapter.connect();
    test.media.playerState = 'IDLE'; test.media.idleReason = 'ERROR'; test.remoteListeners.get('change')!();
    expect(test.state()).toMatchObject({ playback: 'IDLE', idleReason: 'ERROR', hasMedia: false });
  });
});
