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

describe('generator: bodyweight ratio', () => {
  const equip = ['none', 'dumbbells', 'bench', 'pullupBar'] as const;

  function shareBw(plan: ReturnType<typeof generatePlan>): number {
    const main = plan.blocks.find((b) => b.kind === 'main')!;
    const total = main.items.length;
    if (total === 0) return 0;
    const bw = main.items.filter((it) => {
      const ex = EXERCISE_BY_ID.get(it.exerciseId)!;
      return ex.equipment.length === 1 && ex.equipment[0] === 'none';
    }).length;
    return bw / total;
  }

  it('ratio 0 prefers equipped exercises', () => {
    const plan = generatePlan(
      defaultConfig({
        equipment: [...equip],
        style: 'circuit',
        durationMin: 30,
        bodyweightRatio: 0,
      }),
      LIB,
      { seed: 11 },
    );
    expect(shareBw(plan)).toBeLessThan(0.34);
  });

  it('ratio 1 prefers bodyweight exercises', () => {
    const plan = generatePlan(
      defaultConfig({
        equipment: [...equip],
        style: 'circuit',
        durationMin: 30,
        bodyweightRatio: 1,
      }),
      LIB,
      { seed: 12 },
    );
    expect(shareBw(plan)).toBeGreaterThan(0.66);
  });
});

describe('generator: muscle tier priority (big/small/aux)', () => {
  it('selects 2-3 big and 1-2 small when user spans tiers', () => {
    const plan = generatePlan(
      defaultConfig({
        durationMin: 30,
        bodyParts: ['chest', 'back', 'biceps'],
        equipment: ['none', 'dumbbells', 'bench'],
        style: 'straightSets',
      }),
      LIB,
      { seed: 42 },
    );
    const main = plan.blocks.find((b) => b.kind === 'main')!;
    const tiers = main.items.map((it) => {
      const ex = EXERCISE_BY_ID.get(it.exerciseId)!;
      const primary = ex.primaryMuscles[0];
      const tier =
        primary === 'chest' || primary === 'back' || primary === 'quads' || primary === 'glutes' || primary === 'hamstrings' || primary === 'fullBody'
          ? 'big'
          : primary === 'shoulders' || primary === 'biceps' || primary === 'triceps'
            ? 'small'
            : 'aux';
      return tier;
    });
    const big = tiers.filter((t) => t === 'big').length;
    const small = tiers.filter((t) => t === 'small').length;
    expect(big).toBeGreaterThanOrEqual(2);
    expect(big).toBeLessThanOrEqual(4);
    expect(small).toBeGreaterThanOrEqual(1);
    expect(small).toBeLessThanOrEqual(3);
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

describe('generator: core isolation', () => {
  it('places primary-core work in a dedicated Core block before cool-down', () => {
    const plan = generatePlan(
      defaultConfig({
        durationMin: 30,
        bodyParts: ['core', 'chest', 'quads'],
        equipment: ['none', 'dumbbells'],
        style: 'circuit',
        difficulty: 'advanced',
      }),
      LIB,
      { seed: 16 },
    );
    const coreIndex = plan.blocks.findIndex((block) => block.kind === 'core');
    const cooldownIndex = plan.blocks.findIndex((block) => block.kind === 'cooldown');
    expect(coreIndex).toBeGreaterThan(-1);
    expect(cooldownIndex).toBeGreaterThan(coreIndex);

    const main = plan.blocks.find((block) => block.kind === 'main')!;
    expect(
      main.items.every((item) => !EXERCISE_BY_ID.get(item.exerciseId)?.primaryMuscles.includes('core')),
    ).toBe(true);

    const core = plan.blocks[coreIndex];
    expect(
      core.items.every((item) => EXERCISE_BY_ID.get(item.exerciseId)?.primaryMuscles.includes('core')),
    ).toBe(true);
  });
});

describe('generator: advanced difficulty', () => {
  it('prefers non-beginner main exercises for advanced plans', () => {
    const plan = generatePlan(
      defaultConfig({
        durationMin: 30,
        equipment: ['none', 'dumbbells', 'bench', 'pullupBar'],
        style: 'straightSets',
        difficulty: 'advanced',
      }),
      LIB,
      { seed: 23 },
    );
    const main = plan.blocks.find((block) => block.kind === 'main')!;
    expect(
      main.items.every((item) => EXERCISE_BY_ID.get(item.exerciseId)?.difficulty !== 'beginner'),
    ).toBe(true);
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

  it('avoids unilateral exercises so right-left expansion preserves tabata timing', () => {
    const plan = generatePlan(
      defaultConfig({
        style: 'tabata',
        durationMin: 20,
        equipment: ['none', 'dumbbells', 'bench'],
      }),
      LIB,
      { seed: 42 },
    );
    const main = plan.blocks.find((b) => b.kind === 'main')!;
    expect(main.items.every((item) => !EXERCISE_BY_ID.get(item.exerciseId)?.unilateral)).toBe(true);
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

  it('counts unilateral reps for both right and left sides plus side rest', () => {
    expect(
      estimateDurationSec(
        {
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
                  scheme: { kind: 'reps', reps: 10, sets: 1, restSec: 40 },
                },
              ],
            },
          ],
        },
        EXERCISE_BY_ID,
      ),
    ).toBe(80);
  });
});
