import type { JointPose } from './StickFigure';

/**
 * Reference standing pose. Coordinates in viewBox 200x300.
 */
export const STAND: JointPose = {
  head: [100, 50],
  shoulder: [100, 90],
  hip: [100, 170],
  lelbow: [78, 130],
  lhand: [70, 165],
  relbow: [122, 130],
  rhand: [130, 165],
  lknee: [85, 220],
  lfoot: [80, 270],
  rknee: [115, 220],
  rfoot: [120, 270],
};

/** Bottom of squat. */
export const SQUAT_DOWN: JointPose = {
  head: [100, 90],
  shoulder: [100, 130],
  hip: [100, 195],
  lelbow: [70, 165],
  lhand: [55, 195],
  relbow: [130, 165],
  rhand: [145, 195],
  lknee: [70, 235],
  lfoot: [70, 275],
  rknee: [130, 235],
  rfoot: [130, 275],
};

/** Pushup top (plank). */
export const PUSHUP_UP: JointPose = {
  head: [55, 200],
  shoulder: [80, 195],
  hip: [140, 215],
  lelbow: [80, 230],
  lhand: [80, 265],
  relbow: [80, 230],
  rhand: [80, 265],
  lknee: [180, 240],
  lfoot: [195, 270],
  rknee: [180, 240],
  rfoot: [195, 270],
};
export const PUSHUP_DOWN: JointPose = {
  head: [55, 235],
  shoulder: [80, 235],
  hip: [140, 245],
  lelbow: [70, 245],
  lhand: [80, 265],
  relbow: [70, 245],
  rhand: [80, 265],
  lknee: [180, 260],
  lfoot: [195, 270],
  rknee: [180, 260],
  rfoot: [195, 270],
};

/** Plank hold (no movement; A==B). */
export const PLANK: JointPose = PUSHUP_UP;

/** Jumping jacks - feet apart, arms up. */
export const JJ_OPEN: JointPose = {
  head: [100, 40],
  shoulder: [100, 90],
  hip: [100, 170],
  lelbow: [60, 70],
  lhand: [40, 35],
  relbow: [140, 70],
  rhand: [160, 35],
  lknee: [70, 220],
  lfoot: [50, 270],
  rknee: [130, 220],
  rfoot: [150, 270],
};

/** Lunge bottom. */
export const LUNGE_DOWN: JointPose = {
  head: [100, 75],
  shoulder: [100, 115],
  hip: [100, 195],
  lelbow: [78, 155],
  lhand: [70, 190],
  relbow: [122, 155],
  rhand: [130, 190],
  lknee: [70, 240],
  lfoot: [55, 275],
  rknee: [140, 245],
  rfoot: [155, 275],
};

/** Glute bridge top - hips up. */
export const BRIDGE_UP: JointPose = {
  head: [40, 230],
  shoulder: [70, 230],
  hip: [120, 200],
  lelbow: [60, 245],
  lhand: [55, 270],
  relbow: [80, 245],
  rhand: [85, 270],
  lknee: [155, 215],
  lfoot: [170, 270],
  rknee: [155, 215],
  rfoot: [170, 270],
};
export const BRIDGE_DOWN: JointPose = {
  ...BRIDGE_UP,
  hip: [120, 245],
  lknee: [155, 250],
  rknee: [155, 250],
};

/** Mountain climber - knee tucked. */
export const MC_TUCK_LEFT: JointPose = {
  head: [55, 215],
  shoulder: [80, 210],
  hip: [140, 225],
  lelbow: [80, 240],
  lhand: [80, 270],
  relbow: [80, 240],
  rhand: [80, 270],
  lknee: [120, 240],
  lfoot: [110, 270],
  rknee: [180, 245],
  rfoot: [195, 275],
};
export const MC_TUCK_RIGHT: JointPose = {
  head: [55, 215],
  shoulder: [80, 210],
  hip: [140, 225],
  lelbow: [80, 240],
  lhand: [80, 270],
  relbow: [80, 240],
  rhand: [80, 270],
  lknee: [180, 245],
  lfoot: [195, 275],
  rknee: [120, 240],
  rfoot: [110, 270],
};

/** Crunch - shoulders curled up. */
export const CRUNCH_DOWN: JointPose = {
  head: [55, 200],
  shoulder: [85, 215],
  hip: [140, 235],
  lelbow: [60, 195],
  lhand: [50, 175],
  relbow: [60, 195],
  rhand: [50, 175],
  lknee: [165, 195],
  lfoot: [180, 245],
  rknee: [165, 195],
  rfoot: [180, 245],
};
export const CRUNCH_UP: JointPose = {
  head: [85, 180],
  shoulder: [105, 205],
  hip: [140, 235],
  lelbow: [85, 175],
  lhand: [80, 145],
  relbow: [85, 175],
  rhand: [80, 145],
  lknee: [165, 195],
  lfoot: [180, 245],
  rknee: [165, 195],
  rfoot: [180, 245],
};

/** Curl - dumbbell at hip and at shoulder. */
export const CURL_DOWN: JointPose = STAND;
export const CURL_UP: JointPose = {
  ...STAND,
  lelbow: [80, 130],
  lhand: [85, 95],
  relbow: [120, 130],
  rhand: [115, 95],
};

/** Overhead press top. */
export const PRESS_UP: JointPose = {
  ...STAND,
  lelbow: [80, 60],
  lhand: [85, 25],
  relbow: [120, 60],
  rhand: [115, 25],
};
export const PRESS_DOWN: JointPose = {
  ...STAND,
  lelbow: [70, 110],
  lhand: [75, 95],
  relbow: [130, 110],
  rhand: [125, 95],
};
