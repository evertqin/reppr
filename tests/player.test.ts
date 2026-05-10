import { describe, it, expect } from 'vitest';
import { buildSteps, initialState, reducer, type PlayerState, type Step } from '../src/features/player/machine';
import { generatePlan } from '../src/features/generator';
import { buildLibrary } from '../src/data/exercises';
import type { ConfigInput } from '../src/domain/types';

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

  it('repComplete advances when reps target reached', () => {
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
      for (let i = 0; i < cur.reps; i++) s = reducer(s, { type: 'repComplete' });
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
});
