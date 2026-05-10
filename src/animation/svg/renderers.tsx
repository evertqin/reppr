import type { AnimationRenderer } from '../types';
import { StickFigure, type JointPose } from './StickFigure';
import {
  BRIDGE_DOWN,
  BRIDGE_MID,
  BRIDGE_UP,
  CRUNCH_DOWN,
  CRUNCH_MID,
  CRUNCH_UP,
  CURL_DOWN,
  CURL_MID,
  CURL_UP,
  JJ_OPEN,
  LUNGE_DOWN,
  LUNGE_MID,
  MC_TUCK_LEFT,
  MC_TUCK_RIGHT,
  PLANK,
  PRESS_DOWN,
  PRESS_MID,
  PRESS_UP,
  PUSHUP_DOWN,
  PUSHUP_MID,
  PUSHUP_UP,
  SQUAT_DOWN,
  SQUAT_MID,
  STAND,
} from './poses';

/** Build a renderer from a sequence of key poses (looped, evenly spaced). */
function seq(poses: JointPose[], defaultLoopMs?: number): AnimationRenderer {
  return function Renderer(props) {
    return (
      <StickFigure {...props} poses={poses} loopMs={props.loopMs ?? defaultLoopMs} />
    );
  };
}

export const SVG_RENDERERS: Record<string, AnimationRenderer> = {
  squat: seq([STAND, SQUAT_MID, SQUAT_DOWN, SQUAT_MID]),
  lunge: seq([STAND, LUNGE_MID, LUNGE_DOWN, LUNGE_MID]),
  pushup: seq([PUSHUP_UP, PUSHUP_MID, PUSHUP_DOWN, PUSHUP_MID]),
  plank: seq([PLANK]),
  'glute-bridge': seq([BRIDGE_DOWN, BRIDGE_MID, BRIDGE_UP, BRIDGE_MID]),
  'jumping-jack': seq([STAND, JJ_OPEN], 700),
  'mountain-climber': seq([MC_TUCK_LEFT, MC_TUCK_RIGHT], 600),
  crunch: seq([CRUNCH_DOWN, CRUNCH_MID, CRUNCH_UP, CRUNCH_MID]),
  situp: seq([CRUNCH_DOWN, CRUNCH_MID, CRUNCH_UP, CRUNCH_MID]),
  'dumbbell-curl': seq([CURL_DOWN, CURL_MID, CURL_UP, CURL_MID]),
  'dumbbell-press': seq([PRESS_DOWN, PRESS_MID, PRESS_UP, PRESS_MID]),
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
