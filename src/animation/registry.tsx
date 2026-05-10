import type { AnimationRenderer, AnimationRendererProps } from './types';
import { ANIMATION_ALIASES, SVG_RENDERERS } from './svg/renderers';
import { StickFigure } from './svg/StickFigure';
import { STAND } from './svg/poses';
import { LOTTIE_KEYS, LottieRenderer, getLottieData } from './lottie';

const FALLBACK: AnimationRenderer = function FallbackFigure(props) {
  return <StickFigure {...props} poseA={STAND} poseB={STAND} />;
};

const SVG_REGISTRY = new Map<string, AnimationRenderer>(Object.entries(SVG_RENDERERS));

/**
 * Resolution order:
 *   1. Lottie animation bundled at src/animation/lottie/<key>.json
 *   2. Lottie animation under an alias in ANIMATION_ALIASES
 *   3. Hand-built SVG stick figure for <key>
 *   4. SVG renderer under an alias
 *   5. Generic standing figure
 */
function lottieRendererFor(key: string): AnimationRenderer | null {
  if (!LOTTIE_KEYS.has(key)) return null;
  const data = getLottieData(key);
  if (!data) return null;
  return function LottieFor(props) {
    return <LottieRenderer {...props} data={data} />;
  };
}

export function hasRenderer(key: string): boolean {
  if (LOTTIE_KEYS.has(key)) return true;
  if (SVG_REGISTRY.has(key)) return true;
  const alias = ANIMATION_ALIASES[key];
  if (alias && (LOTTIE_KEYS.has(alias) || SVG_REGISTRY.has(alias))) return true;
  return false;
}

export function getRenderer(key: string): AnimationRenderer {
  const direct = lottieRendererFor(key);
  if (direct) return direct;
  if (SVG_REGISTRY.has(key)) return SVG_REGISTRY.get(key)!;
  const alias = ANIMATION_ALIASES[key];
  if (alias) {
    const aliased = lottieRendererFor(alias);
    if (aliased) return aliased;
    if (SVG_REGISTRY.has(alias)) return SVG_REGISTRY.get(alias)!;
  }
  return FALLBACK;
}

export function ExerciseAnimation(props: AnimationRendererProps) {
  const Renderer = getRenderer(props.animationKey);
  return <Renderer {...props} />;
}
