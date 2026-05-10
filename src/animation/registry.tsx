import type { AnimationRenderer, AnimationRendererProps } from './types';
import { ANIMATION_ALIASES, SVG_RENDERERS } from './svg/renderers';
import { StickFigure } from './svg/StickFigure';
import { STAND } from './svg/poses';

const FALLBACK: AnimationRenderer = function FallbackFigure(props) {
  return <StickFigure {...props} poseA={STAND} poseB={STAND} />;
};

const REGISTRY = new Map<string, AnimationRenderer>(Object.entries(SVG_RENDERERS));

export function hasRenderer(key: string): boolean {
  if (REGISTRY.has(key)) return true;
  const alias = ANIMATION_ALIASES[key];
  return !!(alias && REGISTRY.has(alias));
}

export function getRenderer(key: string): AnimationRenderer {
  if (REGISTRY.has(key)) return REGISTRY.get(key)!;
  const alias = ANIMATION_ALIASES[key];
  if (alias && REGISTRY.has(alias)) return REGISTRY.get(alias)!;
  return FALLBACK;
}

export function ExerciseAnimation(props: AnimationRendererProps) {
  const Renderer = getRenderer(props.animationKey);
  return <Renderer {...props} />;
}
