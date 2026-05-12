import { describe, it, expect } from 'vitest';
import { SEED_EXERCISES } from '../src/data/exercises.seed';
import { buildLibrary, findExercises } from '../src/data/exercises';
import {
  parseEnrichment,
  mergeEnrichments,
  type EnrichmentDoc,
} from '../src/data/enrichmentSchema';

describe('seed library integrity', () => {
  it('has at least 30 exercises', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(30);
  });

  it('every exercise has at least one primary muscle', () => {
    for (const ex of SEED_EXERCISES) {
      expect(ex.primaryMuscles.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate ids in seed', () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all entries have an animationKey', () => {
    for (const ex of SEED_EXERCISES) {
      expect(ex.animationKey.length).toBeGreaterThan(0);
    }
  });

  it('marks only true side-specific exercises as unilateral', () => {
    const unilateralIds = SEED_EXERCISES.filter((ex) => ex.unilateral).map((ex) => ex.id);
    expect(unilateralIds.sort()).toEqual([
      'bulgarian-split-squat',
      'concentration-curl',
      'lunge',
      'reverse-lunge',
      'single-arm-dumbbell-row',
    ]);
    expect(SEED_EXERCISES.find((ex) => ex.id === 'bird-dog')?.unilateral).toBeFalsy();
    expect(SEED_EXERCISES.find((ex) => ex.id === 'cat-cow')?.unilateral).toBeFalsy();
  });

  it('findExercises filters by equipment', () => {
    const lib = buildLibrary();
    const bw = findExercises(lib, { equipment: ['none'] });
    expect(bw.every((e) => e.equipment.every((eq) => eq === 'none'))).toBe(true);
    expect(bw.length).toBeGreaterThan(0);
  });

  it('findExercises filters by warmup flag', () => {
    const lib = buildLibrary();
    const warm = findExercises(lib, { warmup: true });
    expect(warm.every((e) => e.isWarmup)).toBe(true);
    expect(warm.length).toBeGreaterThan(0);
  });

  it('findExercises filters by cooldown flag', () => {
    const lib = buildLibrary();
    const cool = findExercises(lib, { cooldown: true });
    expect(cool.every((e) => e.isCooldown)).toBe(true);
    expect(cool.length).toBeGreaterThan(0);
  });
});

describe('enrichment schema', () => {
  it('rejects non-object input', () => {
    expect(() => parseEnrichment(null)).toThrow();
    expect(() => parseEnrichment(42)).toThrow();
  });

  it('rejects wrong schemaVersion', () => {
    expect(() => parseEnrichment({ schemaVersion: 2, exercises: [] })).toThrow();
  });

  it('rejects missing id', () => {
    expect(() => parseEnrichment({ schemaVersion: 1, exercises: [{}] })).toThrow();
  });

  it('rejects unknown muscle group', () => {
    expect(() =>
      parseEnrichment({
        schemaVersion: 1,
        exercises: [{ id: 'x', primaryMuscles: ['arm'] }],
      }),
    ).toThrow(/unknown muscle/);
  });

  it('accepts a valid doc with optional fields', () => {
    const doc = parseEnrichment({
      schemaVersion: 1,
      source: 'test',
      exercises: [
        {
          id: 'pushup',
          cues: ['Tight core'],
        },
      ],
    });
    expect(doc.exercises[0].cues).toEqual(['Tight core']);
  });
});

describe('mergeEnrichments precedence', () => {
  it('seed wins on populated fields', () => {
    const doc: EnrichmentDoc = {
      schemaVersion: 1,
      exercises: [
        {
          id: 'pushup',
          cues: ['New cue 1', 'New cue 2'], // pushup already has cues
        },
      ],
    };
    const merged = mergeEnrichments(SEED_EXERCISES, [doc]);
    const pushup = merged.find((e) => e.id === 'pushup')!;
    expect(pushup.cues).not.toEqual(['New cue 1', 'New cue 2']);
  });

  it('fills empty seed fields', () => {
    // situp seed has empty secondaryMuscles
    const doc: EnrichmentDoc = {
      schemaVersion: 1,
      exercises: [
        {
          id: 'situp',
          secondaryMuscles: ['quads'],
        },
      ],
    };
    const merged = mergeEnrichments(SEED_EXERCISES, [doc]);
    const situp = merged.find((e) => e.id === 'situp')!;
    expect(situp.secondaryMuscles).toEqual(['quads']);
  });

  it('adds entirely new exercises', () => {
    const doc: EnrichmentDoc = {
      schemaVersion: 1,
      exercises: [
        {
          id: 'wall-sit',
          name: 'Wall Sit',
          primaryMuscles: ['quads'],
          equipment: ['none'],
          difficulty: 'beginner',
          animationKey: 'plank',
          tempoSecPerRep: 1,
          defaultScheme: { kind: 'time', workSec: 30, sets: 3, restSec: 30 },
        },
      ],
    };
    const merged = mergeEnrichments(SEED_EXERCISES, [doc]);
    expect(merged.find((e) => e.id === 'wall-sit')).toBeDefined();
  });

  it('rejects new exercise missing required fields', () => {
    const doc: EnrichmentDoc = {
      schemaVersion: 1,
      exercises: [{ id: 'incomplete', cues: ['oops'] }],
    };
    expect(() => mergeEnrichments(SEED_EXERCISES, [doc])).toThrow();
  });
});
