import { describe, it, expect } from 'vitest';
import { generatePlan, estimateDurationSec } from '../src/features/generator';
import { buildLibrary, EXERCISE_BY_ID } from '../src/data/exercises';
import { createRng } from '../src/lib/rng';
import type {
  ConfigInput,
  Difficulty,
  Goal,
  Style,
} from '../src/domain/types';

const LIB = buildLibrary();

function defaultConfig(overrides: Partial<ConfigInput> = {}): ConfigInput {
  return {
    durationMin: 20,
    bodyParts: [],
    goal: 'hypertrophy',
    equipment: ['none'],
    style: 'circuit',
    difficulty: 'intermediate',
    ...overrides,
  };
}

const DURATIONS = [10, 20, 30, 45, 60];
const STYLES: Style[] = ['straightSets', 'circuit', 'hiit', 'tabata'];
const GOALS: Goal[] = ['strength', 'hypertrophy', 'endurance', 'fatLoss', 'mobility'];
const HARD_DIFFS: Difficulty[] = ['beginner', 'advanced'];

describe('generator: duration adherence', () => {
  for (const dur of DURATIONS) {
    for (const style of STYLES) {
      for (const goal of GOALS) {
        for (const diff of HARD_DIFFS) {
          it(`within bounds: ${dur}m ${style} ${goal} ${diff}`, () => {
            const config = defaultConfig({
              durationMin: dur,
              style,
              goal,
              difficulty: diff,
              equipment: ['none', 'dumbbells', 'bands', 'pullupBar', 'bench'],
            });
            const plan = generatePlan(config, LIB, { seed: 42 });
            const target = dur * 60;
            // Tabata has a fixed structure; allow a wider band.
            const tolerance = style === 'tabata' ? 0.6 : 0.25;
            expect(plan.estimatedDurationSec).toBeGreaterThanOrEqual(target * (1 - tolerance));
            expect(plan.estimatedDurationSec).toBeLessThanOrEqual(target * (1 + tolerance));
          });
        }
      }
    }
  }
});

describe('generator: equipment honored', () => {
  it('bodyweight-only config produces no equipment-required main exercises', () => {
    const config = defaultConfig({ equipment: ['none'], style: 'straightSets' });
    const plan = generatePlan(config, LIB, { seed: 1 });
    for (const block of plan.blocks) {
      for (const item of block.items) {
        const ex = EXERCISE_BY_ID.get(item.exerciseId)!;
        expect(ex.equipment).toEqual(['none']);
      }
    }
  });
});

describe('generator: muscle targeting', () => {
  it('chest-focused plan has majority chest hits in main block', () => {
    const config = defaultConfig({
      bodyParts: ['chest'],
      equipment: ['none', 'dumbbells'],
      style: 'straightSets',
      durationMin: 30,
    });
    const plan = generatePlan(config, LIB, { seed: 7 });
    const main = plan.blocks.find((b) => b.kind === 'main')!;
    const total = main.items.length;
    let hits = 0;
    for (const item of main.items) {
      const ex = EXERCISE_BY_ID.get(item.exerciseId)!;
      if (
        ex.primaryMuscles.includes('chest') ||
        ex.secondaryMuscles.includes('chest') ||
        ex.primaryMuscles.includes('fullBody')
      ) {
        hits++;
      }
    }
    expect(hits / total).toBeGreaterThanOrEqual(0.6);
  });
});

describe('generator: tabata structure', () => {
  it('produces 8 exercises x 8 rounds with 20/10', () => {
    const config = defaultConfig({ style: 'tabata' });
    const plan = generatePlan(config, LIB, { seed: 3 });
    const main = plan.blocks.find((b) => b.kind === 'main')!;
    expect(main.items.length).toBe(8);
    expect(main.rounds).toBe(8);
    for (const item of main.items) {
      expect(item.scheme.kind).toBe('time');
      if (item.scheme.kind === 'time') {
        expect(item.scheme.workSec).toBe(20);
        expect(item.scheme.restSec).toBe(10);
      }
    }
  });
});

describe('generator: determinism', () => {
  it('same seed produces same plan', () => {
    const config = defaultConfig();
    const a = generatePlan(config, LIB, { rng: createRng(99) });
    const b = generatePlan(config, LIB, { rng: createRng(99) });
    // strip generated ids that are deterministic from same RNG
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seed produces different exercise selection (most of the time)', () => {
    const config = defaultConfig({ durationMin: 30, style: 'circuit' });
    const a = generatePlan(config, LIB, { seed: 1 });
    const b = generatePlan(config, LIB, { seed: 2 });
    const aIds = a.blocks.flatMap((blk) => blk.items.map((i) => i.exerciseId)).join(',');
    const bIds = b.blocks.flatMap((blk) => blk.items.map((i) => i.exerciseId)).join(',');
    expect(aIds).not.toBe(bIds);
  });
});

describe('estimateDurationSec', () => {
  it('returns positive seconds for valid plan', () => {
    const plan = generatePlan(defaultConfig(), LIB, { seed: 5 });
    expect(estimateDurationSec(plan, EXERCISE_BY_ID)).toBeGreaterThan(0);
  });
});
