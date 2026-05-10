import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import type { LottieRefCurrentProps } from 'lottie-react';
import type { AnimationRendererProps } from '../types';/**
 * Eagerly discover bundled Lottie JSON sources keyed by animationKey
 * (filename without `.json`). Drop a `<animationKey>.json` file into
 * this folder to register a renderer for it.
 *
 * The JSON itself is bundled (small), but the lottie-react runtime is
 * code-split below.
 */
const SOURCES = import.meta.glob<unknown>('./*.json', {
  eager: true,
  import: 'default',
});

export const LOTTIE_KEYS: Set<string> = new Set(
  Object.keys(SOURCES)
    .map((path) => {
      const m = path.match(/\.\/(.+)\.json$/);
      return m ? m[1] : '';
    })
    .filter(Boolean),
);

export function getLottieData(key: string): unknown | null {
  return SOURCES[`./${key}.json`] ?? null;
}

// Lazy-load lottie-react so the runtime stays out of the initial bundle.
const LottiePlayer = lazy(async () => {
  const mod = await import('lottie-react');
  return { default: mod.default };
});

export interface LottieRendererProps extends AnimationRendererProps {
  data: unknown;
}

/**
 * Render a Lottie animation, syncing playback speed to the player's `loopMs`
 * so a per-rep cadence matches the exercise's `tempoSecPerRep`.
 */
export function LottieRenderer({
  data,
  loop,
  loopMs,
  scale = 1,
  ariaLabel,
}: LottieRendererProps) {
  const ref = useRef<LottieRefCurrentProps>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Compute speed = nativeDurationMs / desiredDurationMs.
  const speed = useMemo(() => {
    if (!loopMs || typeof data !== 'object' || data === null) return 1;
    const meta = data as { fr?: number; ip?: number; op?: number };
    if (!meta.fr || meta.op == null || meta.ip == null) return 1;
    const nativeMs = ((meta.op - meta.ip) / meta.fr) * 1000;
    return nativeMs > 0 ? nativeMs / loopMs : 1;
  }, [data, loopMs]);

  // Size the wrapper to the Lottie's native aspect ratio so the figure fills
  // the available space (no large blank bars when the asset is square).
  // The reference height matches the SVG stick figure's 300px so layouts line up.
  const { width, height } = useMemo(() => {
    const meta = (data ?? {}) as { w?: number; h?: number };
    const nativeW = typeof meta.w === 'number' ? meta.w : 200;
    const nativeH = typeof meta.h === 'number' ? meta.h : 300;
    const refH = 300;
    const aspect = nativeW / nativeH;
    return { width: refH * aspect * scale, height: refH * scale };
  }, [data, scale]);

  useEffect(() => {
    ref.current?.setSpeed(speed);
  }, [speed]);

  // Warn (in dev) if the Lottie loaded but produced no visible paths — this is
  // almost always a malformed file (e.g. a shape group missing its required `tr`).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = setTimeout(() => {
      const root = wrapperRef.current?.querySelector('svg');
      if (root && root.querySelectorAll('path').length === 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[lottie] "${ariaLabel}" rendered with 0 paths. The JSON is likely malformed (missing \`tr\` transform in a shape group, or unsupported features).`,
        );
      }
    }, 500);
    return () => clearTimeout(id);
  }, [ariaLabel, data]);

  return (
    <div
      ref={wrapperRef}
      role="img"
      aria-label={ariaLabel}
      style={{ width, height, color: 'var(--accent)' }}
    >
      <Suspense fallback={<div style={{ width: '100%', height: '100%' }} />}>
        <LottiePlayer
          lottieRef={ref}
          animationData={data}
          loop={loop ?? true}
          autoplay
          rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
        />
      </Suspense>
    </div>
  );
}
