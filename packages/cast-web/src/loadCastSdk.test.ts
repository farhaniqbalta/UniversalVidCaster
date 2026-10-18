import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.head.innerHTML = ''; window.__onGCastApiAvailable = undefined as unknown as typeof window.__onGCastApiAvailable; });
describe('SDK loader', () => {
  it('registers callback before inserting script and shares initialization', async () => {
    vi.resetModules(); vi.stubGlobal('isSecureContext', true);
    const { loadCastSdk } = await import('./loadCastSdk');
    const promise = loadCastSdk();
    expect(loadCastSdk()).toBe(promise);
    expect(document.querySelector('script')?.src).toContain('loadCastFramework=1');
    expect(window.__onGCastApiAvailable).toBeTypeOf('function');
    window.__onGCastApiAvailable!(true); await promise;
  });
  it('reports a script download failure', async () => {
    vi.resetModules(); vi.stubGlobal('isSecureContext', true);
    const { loadCastSdk } = await import('./loadCastSdk');
    const promise = loadCastSdk();
    document.querySelector('script')!.dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow('download');
    expect(document.querySelector('script')).toBeNull();
  });
  it('reports unavailable sender runtime', async () => {
    vi.resetModules(); vi.stubGlobal('isSecureContext', true);
    const { loadCastSdk } = await import('./loadCastSdk');
    const promise = loadCastSdk(); window.__onGCastApiAvailable!(false);
    await expect(promise).rejects.toThrow('unavailable');
  });
  it('times out rather than waiting indefinitely', async () => {
    vi.resetModules(); vi.useFakeTimers(); vi.stubGlobal('isSecureContext', true);
    const { loadCastSdk } = await import('./loadCastSdk');
    const assertion = expect(loadCastSdk()).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(20000); await assertion;
  });
  it('rejects insecure origins', async () => {
    vi.resetModules(); vi.stubGlobal('isSecureContext', false);
    const { loadCastSdk } = await import('./loadCastSdk');
    await expect(loadCastSdk()).rejects.toThrow('HTTPS');
  });
});
