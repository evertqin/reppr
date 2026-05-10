import type { AnimationRenderer } from '../types';
import { StickFigure } from './StickFigure';
import {
  BRIDGE_DOWN,
  BRIDGE_UP,
  CRUNCH_DOWN,
  CRUNCH_UP,
  CURL_DOWN,
  CURL_UP,
  JJ_OPEN,
  LUNGE_DOWN,
  MC_TUCK_LEFT,
  MC_TUCK_RIGHT,
  PLANK,
  PRESS_DOWN,
  PRESS_UP,
  PUSHUP_DOWN,
  PUSHUP_UP,
  SQUAT_DOWN,
  STAND,
} from './poses';

function make(poseA: typeof STAND, poseB: typeof STAND, defaultLoopMs?: number): AnimationRenderer {
  return function Renderer(props) {
    return (
      <StickFigure
        {...props}
        poseA={poseA}
        poseB={poseB}
        loopMs={props.loopMs ?? defaultLoopMs}
      />
    );
  };
}

export const SVG_RENDERERS: Record<string, AnimationRenderer> = {
  squat: make(STAND, SQUAT_DOWN),
  lunge: make(STAND, LUNGE_DOWN),
  pushup: make(PUSHUP_UP, PUSHUP_DOWN),
  plank: make(PLANK, PLANK),
  'glute-bridge': make(BRIDGE_DOWN, BRIDGE_UP),
  'jumping-jack': make(STAND, JJ_OPEN, 700),
  'mountain-climber': make(MC_TUCK_LEFT, MC_TUCK_RIGHT, 600),
  crunch: make(CRUNCH_DOWN, CRUNCH_UP),
  situp: make(CRUNCH_DOWN, CRUNCH_UP),
  'dumbbell-curl': make(CURL_DOWN, CURL_UP),
  'dumbbell-press': make(PRESS_DOWN, PRESS_UP),
};

/** Mapping from animationKeys without dedicated SVGs to closest available renderer. */
export const ANIMATION_ALIASES: Record<string, string> = {
  'goblet-squat': 'squat',
  'reverse-lunge': 'lunge',
  burpee: 'pushup',
  'pike-pushup': 'pushup',
  dip: 'pushup',
  pullup: 'dumbbell-curl',
  'dumbbell-row': 'dumbbell-curl',
  'dumbbell-rdl': 'squat',
  'lateral-raise': 'jumping-jack',
  'tricep-kickback': 'dumbbell-press',
  'band-pull-apart': 'jumping-jack',
  'hollow-hold': 'plank',
  superman: 'plank',
  'bird-dog': 'plank',
  'cat-cow': 'plank',
  'arm-circles': 'jumping-jack',
  'hip-circles': 'jumping-jack',
  'world-greatest-stretch': 'lunge',
  'child-pose': 'plank',
};
