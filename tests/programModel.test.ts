import { describe, expect, it } from 'vitest';
import {
  HYPERTROPHY_PROGRAM,
  createProgramPlan,
  getScheduledPrimaryDay,
  normalizeLoggedReps,
  resolveExerciseTarget,
} from '../src/features/program/model';

describe('program model progression', () => {
  it('keeps load and asks for more reps when top range is not met', () => {
    const day = getScheduledPrimaryDay(HYPERTROPHY_PROGRAM, 0);
    const template = day.exercises[0];
    const target = resolveExerciseTarget({
      program: HYPERTROPHY_PROGRAM,
      template,
      week: 3,
      previousReps: [12, 10, 8],
      previousWeightLb: 40,
    });
    expect(target.targetWeightLb).toBe(40);
    expect(target.recommendation).toContain('Keep 40 lb');
  });

  it('increases load by one step when all sets hit top range', () => {
    const day = getScheduledPrimaryDay(HYPERTROPHY_PROGRAM, 0);
    const template = day.exercises[0];
    const target = resolveExerciseTarget({
      program: HYPERTROPHY_PROGRAM,
      template,
      week: 3,
      previousReps: [12, 12, 12],
      previousWeightLb: 40,
    });
    expect(target.targetWeightLb).toBe(45);
    expect(target.nextSessionTarget).toContain('45 lb');
  });

  it('does not exceed the 50 lb ceiling', () => {
    const day = getScheduledPrimaryDay(HYPERTROPHY_PROGRAM, 0);
    const template = day.exercises[0];
    const target = resolveExerciseTarget({
      program: HYPERTROPHY_PROGRAM,
      template,
      week: 8,
      previousReps: [12, 12, 12],
      previousWeightLb: 50,
    });
    expect(target.targetWeightLb).toBe(50);
    expect(target.recommendation).toContain('50 lb ceiling');
  });
});

describe('program plan creation', () => {
  it('embeds programmed metadata for player and logging', () => {
    const day = getScheduledPrimaryDay(HYPERTROPHY_PROGRAM, 0);
    const firstTemplate = day.exercises[0];
    const target = resolveExerciseTarget({
      program: HYPERTROPHY_PROGRAM,
      template: firstTemplate,
      week: 1,
      previousReps: [],
    });
    const plan = createProgramPlan({
      program: HYPERTROPHY_PROGRAM,
      day,
      week: 1,
      sessionNumber: 1,
      exerciseTargets: { [firstTemplate.exerciseId]: target },
    });

    expect(plan.programSession?.programId).toBe(HYPERTROPHY_PROGRAM.id);
    expect(plan.blocks[0].items[0].programmed?.repRange.min).toBeGreaterThan(0);
    expect(plan.blocks[0].items[0].programmed?.prescribedWeightLb).toBeGreaterThanOrEqual(0);
  });

  it('normalizes unilateral logs by set pair for progression', () => {
    const reps = normalizeLoggedReps({
      exerciseId: 'reverse-lunge',
      targetWeightLb: 20,
      repRange: { min: 8, max: 12 },
      setsTarget: 3,
      unilateral: true,
      repsCompleted: [10, 10, 9, 9, 8, 8],
      skippedSetIndexes: [],
      recommendation: '',
    });
    expect(reps).toEqual([10, 9, 8]);
  });
});
