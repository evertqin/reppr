import type React from 'react';

export interface AnimationRendererProps {
  animationKey: string;
  /** 0..1 of one rep; player drives this for rep-based exercises. */
  repProgress?: number;
  /** Loop driver; renderer ignores repProgress and self-loops. */
  loop?: boolean;
  /** Override the renderer's default cycle duration in ms when looping. */
  loopMs?: number;
  /** Visual scale; default 1. */
  scale?: number;
  ariaLabel: string;
}

export type AnimationRenderer = React.ComponentType<AnimationRendererProps>;

export interface AnimationRegistry {
  has(key: string): boolean;
  get(key: string): AnimationRenderer;
}
