import { useEffect, useRef } from 'react';

/**
 * Drives a tick callback at ~`hz` updates per second using requestAnimationFrame,
 * passing the elapsed time since the previous tick in ms. Pauses when `enabled` is false.
 */
export function useTicker(enabled: boolean, hz: number, onTick: (deltaMs: number) => void): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return;
    let frame: number;
    let last: number | null = null;
    const interval = 1000 / hz;
    const loop = (now: number) => {
      if (last == null) last = now;
      const delta = now - last;
      if (delta >= interval) {
        onTickRef.current(delta);
        last = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [enabled, hz]);
}
