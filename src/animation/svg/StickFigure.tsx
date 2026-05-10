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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPose(a: JointPose, b: JointPose, t: number): JointPose {
  const k = (key: keyof JointPose): [number, number] => [
    lerp(a[key][0], b[key][0], t),
    lerp(a[key][1], b[key][1], t),
  ];
  return {
    head: k('head'),
    hip: k('hip'),
    shoulder: k('shoulder'),
    lhand: k('lhand'),
    rhand: k('rhand'),
    lelbow: k('lelbow'),
    relbow: k('relbow'),
    lknee: k('lknee'),
    rknee: k('rknee'),
    lfoot: k('lfoot'),
    rfoot: k('rfoot'),
  };
}

export interface StickFigureProps extends AnimationRendererProps {
  poseA: JointPose;
  poseB: JointPose;
  /** Cycle length in ms when looping. Default 1500ms. */
  loopMs?: number;
}

/**
 * Renders a stick figure interpolated between two key poses.
 * - When `loop` is true, animates A→B→A continuously.
 * - When `repProgress` is provided (0..1), maps to the same triangle wave for one rep.
 * - Honors prefers-reduced-motion by freezing on poseA.
 */
export function StickFigure({
  poseA,
  poseB,
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

  useEffect(() => {
    if (reduced || !loop) return;
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) % loopMs;
      const phase = elapsed / loopMs; // 0..1
      const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      setT(tri);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      startRef.current = null;
    };
  }, [loop, loopMs, reduced]);

  const interp = useMemo(() => {
    if (reduced) return 0;
    if (loop) return t;
    if (typeof repProgress === 'number') {
      const r = Math.max(0, Math.min(1, repProgress));
      return r < 0.5 ? r * 2 : 2 - r * 2;
    }
    return 0;
  }, [reduced, loop, t, repProgress]);

  const pose = lerpPose(poseA, poseB, interp);
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
      <circle cx={pose.head[0]} cy={pose.head[1]} r={headR} stroke={stroke} strokeWidth={sw} fill="none" />
      <line x1={pose.head[0]} y1={pose.head[1] + headR} x2={pose.shoulder[0]} y2={pose.shoulder[1]} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <line x1={pose.shoulder[0]} y1={pose.shoulder[1]} x2={pose.hip[0]} y2={pose.hip[1]} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      {/* arms */}
      <polyline points={`${pose.shoulder[0]},${pose.shoulder[1]} ${pose.lelbow[0]},${pose.lelbow[1]} ${pose.lhand[0]},${pose.lhand[1]}`} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${pose.shoulder[0]},${pose.shoulder[1]} ${pose.relbow[0]},${pose.relbow[1]} ${pose.rhand[0]},${pose.rhand[1]}`} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* legs */}
      <polyline points={`${pose.hip[0]},${pose.hip[1]} ${pose.lknee[0]},${pose.lknee[1]} ${pose.lfoot[0]},${pose.lfoot[1]}`} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${pose.hip[0]},${pose.hip[1]} ${pose.rknee[0]},${pose.rknee[1]} ${pose.rfoot[0]},${pose.rfoot[1]}`} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
