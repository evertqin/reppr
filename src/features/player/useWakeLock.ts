import { useEffect, useRef } from 'react';

/**
 * Acquire a screen wake lock while `active` is true. No-op on unsupported browsers.
 */
export function useWakeLock(active: boolean): void {
  const sentinel = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    nav.wakeLock
      .request('screen')
      .then((sent) => {
        if (cancelled) {
          void sent.release();
          return;
        }
        sentinel.current = sent;
      })
      .catch(() => {
        // ignored
      });
    return () => {
      cancelled = true;
      if (sentinel.current) {
        void sentinel.current.release();
        sentinel.current = null;
      }
    };
  }, [active]);
}
