import { describe, expect, it, vi } from 'vitest';
import { CastController } from './CastController';
import type { CastSenderAdapter } from '../transport/CastSenderAdapter';
import type { CastState } from '../models/CastState';

function setup() {
  let emit!: (state: Partial<CastState>) => void;
  const unsubscribe = vi.fn();
  const adapter: CastSenderAdapter = {
    initialize: vi.fn(async () => { emit({ available: true }); }),
    subscribe: listener => { emit = listener; return unsubscribe; },
    connect: vi.fn(async () => { emit({ connected: true }); }),
    load: vi.fn(async () => {}), play: vi.fn(async () => {}), pause: vi.fn(async () => {}),
    seek: vi.fn(async () => {}), stop: vi.fn(async () => {}), disconnect: vi.fn(async () => {}), dispose: vi.fn(),
  };
  const controller = new CastController(adapter);
  return { controller, adapter, emit: (state: Partial<CastState>) => emit(state), unsubscribe };
}
describe('CastController', () => {
  it('owns operation state even when an untyped adapter sends busy/error fields', async () => {
    const { controller, adapter, emit } = setup();
    emit({ connected: true, hasMedia: true });
    let finish!: () => void;
    vi.mocked(adapter.play).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = controller.play();
    emit({ busy: false, error: 'adapter error', playback: 'PLAYING' });
    expect(controller.getState()).toMatchObject({ busy: true, error: undefined, playback: 'PLAYING' });
    finish(); await pending;
  });
  it('clears stale playback on external disconnection', () => {
    const { controller, emit } = setup();
    emit({ connected: true, hasMedia: true, playback: 'PLAYING', durationMs: 10000, positionMs: 3000, canSeek: true, deviceName: 'TV' });
    emit({ connected: false });
    expect(controller.getState()).toMatchObject({ connected: false, playback: 'UNKNOWN', hasMedia: false, canSeek: false, durationMs: 0, positionMs: 0, deviceName: undefined });
  });
  it('ignores late failures and events after disposal and rejects future operations', async () => {
    const { controller, adapter, emit, unsubscribe } = setup();
    emit({ available: true });
    let fail!: (error: Error) => void;
    vi.mocked(adapter.connect).mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    const pending = controller.connect();
    controller.dispose(); const snapshot = controller.getState();
    controller.dispose();
    fail(new Error('late failure')); await expect(pending).rejects.toThrow('late failure');
    emit({ connected: true });
    expect(controller.getState()).toEqual(snapshot);
    expect(unsubscribe).toHaveBeenCalledOnce(); expect(adapter.dispose).toHaveBeenCalledOnce();
    await expect(controller.initialize()).rejects.toThrow('disposed');
    await expect(controller.connect()).rejects.toThrow('disposed');
    expect(() => controller.subscribe(() => {})).toThrow('disposed');
  });
  it('recovers from rejected load and control operations without inventing playback state', async () => {
    const { controller, adapter, emit } = setup(); emit({ connected: true });
    vi.mocked(adapter.load).mockRejectedValueOnce(new Error('load failed'));
    await expect(controller.load({ url: 'https://example.test/a.mp4' })).rejects.toThrow('load failed');
    await controller.load({ url: 'https://example.test/a.mp4' });
    expect(controller.getState()).toMatchObject({ playback: 'UNKNOWN', error: undefined, busy: false });
    emit({ hasMedia: true, playback: 'PAUSED' });
    vi.mocked(adapter.play).mockRejectedValueOnce(new Error('control failed'));
    await expect(controller.play()).rejects.toThrow('control failed');
    await controller.play();
    expect(controller.getState()).toMatchObject({ playback: 'PAUSED', error: undefined });
  });
  it('does not equate connection or load completion with playback', async () => {
    const { controller, adapter, emit } = setup();
    await controller.initialize(); await controller.connect();
    await controller.load({ url: 'https://example.test/movie.mp4' });
    expect(adapter.load).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'video/mp4' }));
    expect(controller.getState().playback).toBe('UNKNOWN');
    emit({ playback: 'PLAYING', hasMedia: true });
    expect(controller.getState().playback).toBe('PLAYING');
  });
  it('blocks controls before media and validates seeks', async () => {
    const { controller, adapter, emit } = setup();
    await expect(controller.play()).rejects.toThrow('Connect');
    emit({ connected: true });
    await expect(controller.pause()).rejects.toThrow('Load');
    emit({ hasMedia: true, canSeek: true, durationMs: 10000 });
    await expect(controller.seek(11000)).rejects.toThrow('Seek');
    await controller.seek(5000);
    expect(adapter.seek).toHaveBeenCalledWith(5000);
  });
  it('preserves user activation by calling connect synchronously', async () => {
    const { controller, adapter, emit } = setup(); emit({ available: true });
    const promise = controller.connect();
    expect(adapter.connect).toHaveBeenCalledOnce(); await promise;
  });
  it('reports SDK cancellation and allows another attempt', async () => {
    const { controller, adapter, emit } = setup(); emit({ available: true });
    vi.mocked(adapter.connect).mockRejectedValueOnce('cancel');
    await expect(controller.connect()).rejects.toBe('cancel');
    expect(controller.getState()).toMatchObject({ error: 'cancel', busy: false, connected: false });
    await controller.connect(); expect(controller.getState().error).toBeUndefined();
  });
  it('rejects overlapping operations and cleans up subscriptions', async () => {
    const { controller, adapter, emit, unsubscribe } = setup(); emit({ available: true });
    let finish!: () => void;
    vi.mocked(adapter.connect).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = controller.connect();
    await expect(controller.connect()).rejects.toThrow('in progress');
    finish(); await pending;
    controller.dispose(); expect(unsubscribe).toHaveBeenCalledOnce(); expect(adapter.dispose).toHaveBeenCalledOnce();
  });
});
