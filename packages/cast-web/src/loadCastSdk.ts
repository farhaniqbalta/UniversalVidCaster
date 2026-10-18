let pending: Promise<void> | undefined;

export function loadCastSdk(): Promise<void> {
  if (typeof cast !== 'undefined' && cast.framework) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error('Use HTTPS or a trustworthy localhost origin in desktop Chrome.'));
      return;
    }
    const script = document.createElement('script');
    const previous = window.__onGCastApiAvailable;
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      window.__onGCastApiAvailable = previous;
      script.onerror = null;
      if (error) { script.remove(); reject(error); } else resolve();
    };
    const timer = window.setTimeout(() => finish(new Error('Cast SDK timed out. Check network access and reload.')), 20000);
    window.__onGCastApiAvailable = available => {
      finish(available ? undefined : new Error('Cast is unavailable. Use supported desktop Chrome.'));
      previous?.(available);
    };
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    script.onerror = () => finish(new Error('Could not download the Google Cast SDK. Check your network and reload.'));
    document.head.append(script);
  });
  // Keep failures stable: retrying a partially loaded SDK requires a page reload.
  return pending;
}
