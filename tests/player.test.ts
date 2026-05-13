import { describe, it, expect } from 'vitest';
import { buildSteps, initialState, reducer, type PlayerState, type Step } from '../src/features/player/machine';
import { generatePlan } from '../src/features/generator';
import { buildLibrary } from '../src/data/exercises';
import type { ConfigInput, WorkoutPlan } from '../src/domain/types';

const LIB = buildLibrary();
const BY_ID = new Map(LIB.map((e) => [e.id, e]));

const config: ConfigInput = {
  durationMin: 20,
  bodyParts: [],
  goal: 'hypertrophy',
  equipment: ['none'],
  style: 'circuit',
  difficulty: 'intermediate',
};

const plan = generatePlan(config, LIB, { seed: 7 });
const STEPS: Step[] = buildSteps(plan, BY_ID);

const unilateralPlan: WorkoutPlan = {
  id: 'unilateral-plan',
  createdAt: '2026-01-01T00:00:00.000Z',
  name: 'Unilateral test',
  config,
  estimatedDurationSec: 0,
  blocks: [
    {
      id: 'main',
      kind: 'main',
      label: 'Main',
      rounds: 1,
      interItemRestSec: 0,
      interRoundRestSec: 0,
      items: [
        {
          id: 'row',
          exerciseId: 'single-arm-dumbbell-row',
          scheme: { kind: 'reps', reps: 10, sets: 2, restSec: 60 },
        },
      ],
    },
  ],
};

function init(): PlayerState {
  return initialState(STEPS);
}

describe('player reducer', () => {
  it('starts in idle state', () => {
    expect(init().status).toBe('idle');
  });

  it('start moves to countdown', () => {
    const s = reducer(init(), { type: 'start' });
    expect(s.status).toBe('countdown');
    expect(s.countdown).toBe(3);
  });

  it('countdown advances to first step after 3s of ticks', () => {
    let s = reducer(init(), { type: 'start' });
    for (let i = 0; i < 30; i++) s = reducer(s, { type: 'tick', deltaMs: 100 });
    expect(['work', 'rest']).toContain(s.status);
    expect(s.stepIndex).toBe(0);
  });

  it('pause then resume preserves status', () => {
    let s = reducer(init(), { type: 'start' });
    for (let i = 0; i < 35; i++) s = reducer(s, { type: 'tick', deltaMs: 100 });
    const before = s.status;
    s = reducer(s, { type: 'pause' });
    expect(s.status).toBe('paused');
    s = reducer(s, { type: 'resume' });
    expect(s.status).toBe(before);
  });

  it('skipForward advances index', () => {
    let s = reducer(init(), { type: 'start' });
    for (let i = 0; i < 30; i++) s = reducer(s, { type: 'tick', deltaMs: 100 });
    const idx = s.stepIndex;
    s = reducer(s, { type: 'skipForward' });
    expect(s.stepIndex).toBe(idx + 1);
  });

  it('skipBack decrements index but not below 0', () => {
    let s = reducer(init(), { type: 'start' });
    for (let i = 0; i < 30; i++) s = reducer(s, { type: 'tick', deltaMs: 100 });
    s = reducer(s, { type: 'skipBack' });
    expect(s.stepIndex).toBe(0);
    s = reducer(s, { type: 'skipBack' });
    expect(s.stepIndex).toBe(0);
  });

  it('completeWork advances rep-based work with one action', () => {
    let s = reducer(init(), { type: 'start' });
    for (let i = 0; i < 30; i++) s = reducer(s, { type: 'tick', deltaMs: 100 });
    // find the first rep-based work step
    while (s.stepIndex < STEPS.length) {
      const cur = STEPS[s.stepIndex];
      if (cur.kind === 'work' && cur.reps != null) break;
      s = reducer(s, { type: 'skipForward' });
    }
    const cur = STEPS[s.stepIndex];
    if (cur.kind === 'work' && cur.reps != null) {
      const idx = s.stepIndex;
      s = reducer(s, { type: 'completeWork' });
      expect(s.stepIndex).toBe(idx + 1);
    }
  });

  it('skipForward past end finishes the workout', () => {
    let s = reducer(init(), { type: 'start' });
    for (let i = 0; i < 30; i++) s = reducer(s, { type: 'tick', deltaMs: 100 });
    for (let i = 0; i < STEPS.length + 1; i++) s = reducer(s, { type: 'skipForward' });
    expect(s.status).toBe('finished');
    expect(s.done).toBe(true);
  });

  it('abort returns to a finished/empty state', () => {
    let s = reducer(init(), { type: 'start' });
    s = reducer(s, { type: 'abort' });
    expect(s.done).toBe(true);
  });

  it('expands unilateral work into right then left with rest after both sides', () => {
    const steps = buildSteps(unilateralPlan, BY_ID);
    expect(steps).toHaveLength(5);
    expect(steps[0]).toMatchObject({ kind: 'work', exerciseId: 'single-arm-dumbbell-row', side: 'right' });
    expect(steps[1]).toMatchObject({ kind: 'work', exerciseId: 'single-arm-dumbbell-row', side: 'left' });
    expect(steps[2]).toMatchObject({ kind: 'rest', durationSec: 60 });
    expect(steps[3]).toMatchObject({ kind: 'work', exerciseId: 'single-arm-dumbbell-row', side: 'right' });
    expect(steps[4]).toMatchObject({ kind: 'work', exerciseId: 'single-arm-dumbbell-row', side: 'left' });
  });
});
