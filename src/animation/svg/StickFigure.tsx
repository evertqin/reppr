import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationRendererProps } from '../types';
import { prefersReducedMotion } from '../reducedMotion';

export interface JointPose {
  /** Head center. */
  head: [number, number];
  /** Hip joint (pelvis center). */
  hip: [number, number];
  /** Shoulder joint (upper torso). */
  shoulder: [number, number];
  /** Left & right hand. */
  lhand: [number, number];
  rhand: [number, number];
  /** Elbows. */
  lelbow: [number, number];
  relbow: [number, number];
  /** Knees. */
  lknee: [number, number];
  rknee: [number, number];
  /** Feet. */
  lfoot: [number, number];
  rfoot: [number, number];
}

const POSE_KEYS: (keyof JointPose)[] = [
  'head',
  'hip',
  'shoulder',
  'lhand',
  'rhand',
  'lelbow',
  'relbow',
  'lknee',
  'rknee',
  'lfoot',
  'rfoot',
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPose(a: JointPose, b: JointPose, t: number): JointPose {
  const out = {} as JointPose;
  for (const key of POSE_KEYS) {
    out[key] = [lerp(a[key][0], b[key][0], t), lerp(a[key][1], b[key][1], t)];
  }
  return out;
}

/** Smoothstep easing — no jolt at the ends of each segment. */
function ease(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Sample a multi-keyframe pose timeline at normalized time `t` in [0, 1].
 * Frames are evenly spaced; the timeline is treated as cyclic so we wrap
 * the last frame back to the first when looping.
 */
function samplePoseSequence(frames: JointPose[], t: number): JointPose {
  if (frames.length === 0) {
    throw new Error('samplePoseSequence: at least one frame required');
  }
  if (frames.length === 1) return frames[0];
  const cyclic = [...frames, frames[0]];
  const segCount = cyclic.length - 1;
  const scaled = Math.max(0, Math.min(0.9999999, t)) * segCount;
  const i = Math.floor(scaled);
  const local = scaled - i;
  return lerpPose(cyclic[i], cyclic[i + 1], ease(local));
}

export interface StickFigureProps extends AnimationRendererProps {
  /** Two-pose shorthand (kept for back-compat). */
  poseA?: JointPose;
  poseB?: JointPose;
  /** Multi-keyframe timeline (preferred). Played evenly spaced across one cycle. */
  poses?: JointPose[];
  /** Cycle length in ms when looping. Default 1500ms. */
  loopMs?: number;
}

/**
 * Renders a stick figure interpolated across a sequence of key poses.
 * - When `loop` is true, animates through the timeline cyclically.
 * - When `repProgress` is provided (0..1), maps to one full pass of the timeline.
 * - Honors prefers-reduced-motion by freezing on the first frame.
 */
export function StickFigure({
  poseA,
  poseB,
  poses,
  repProgress,
  loop,
  scale = 1,
  ariaLabel,
  loopMs = 1500,
}: StickFigureProps) {
  const reduced = prefersReducedMotion();
  const [t, setT] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const timeline: JointPose[] = useMemo(() => {
    if (poses && poses.length > 0) return poses;
    if (poseA && poseB) return [poseA, poseB];
    if (poseA) return [poseA];
    if (poseB) return [poseB];
    throw new Error('StickFigure: provide either `poses` or both `poseA` and `poseB`.');
  }, [poses, poseA, poseB]);

  useEffect(() => {
    if (reduced || !loop) return;
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) % loopMs;
      setT(elapsed / loopMs);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      startRef.current = null;
    };
  }, [loop, loopMs, reduced]);

  const phase = useMemo(() => {
    if (reduced) return 0;
    if (loop) return t;
    if (typeof repProgress === 'number') return Math.max(0, Math.min(1, repProgress));
    return 0;
  }, [reduced, loop, t, repProgress]);

  const pose = samplePoseSequence(timeline, phase);
  const stroke = 'currentColor';
  const sw = 6;
  const headR = 14;
  const w = 200;
  const h = 300;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={200 * scale}
      height={300 * scale}
      role="img"
      aria-label={ariaLabel}
      style={{ color: 'var(--accent)', display: 'block' }}
    >
      <line x1={0} y1={h - 8} x2={w} y2={h - 8} stroke={stroke} strokeWidth={2} opacity={0.25} />
      <circle
        cx={pose.head[0]}
        cy={pose.head[1]}
        r={headR}
        stroke={stroke}
        strokeWidth={sw}
        fill="none"
      />
      <line
        x1={pose.head[0]}
        y1={pose.head[1] + headR}
        x2={pose.shoulder[0]}
        y2={pose.shoulder[1]}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <line
        x1={pose.shoulder[0]}
        y1={pose.shoulder[1]}
        x2={pose.hip[0]}
        y2={pose.hip[1]}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {/* arms */}
      <polyline
        points={`${pose.shoulder[0]},${pose.shoulder[1]} ${pose.lelbow[0]},${pose.lelbow[1]} ${pose.lhand[0]},${pose.lhand[1]}`}
        stroke={stroke}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`${pose.shoulder[0]},${pose.shoulder[1]} ${pose.relbow[0]},${pose.relbow[1]} ${pose.rhand[0]},${pose.rhand[1]}`}
        stroke={stroke}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* legs */}
      <polyline
        points={`${pose.hip[0]},${pose.hip[1]} ${pose.lknee[0]},${pose.lknee[1]} ${pose.lfoot[0]},${pose.lfoot[1]}`}
        stroke={stroke}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`${pose.hip[0]},${pose.hip[1]} ${pose.rknee[0]},${pose.rknee[1]} ${pose.rfoot[0]},${pose.rfoot[1]}`}
        stroke={stroke}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
