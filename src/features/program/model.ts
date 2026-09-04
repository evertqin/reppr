import type { ConfigInput, Exercise, PlanItem, WorkoutPlan } from '../../domain/types';

export interface ProgramRepRange {
  min: number;
  max: number;
}

export interface ProgramExerciseTemplate {
  exerciseId: string;
  sets: number;
  repRange: ProgramRepRange;
  startWeightLb: number;
  restSec: number;
  notes?: string;
}

export interface ProgramDayTemplate {
  id: string;
  label: string;
  kind: 'primary' | 'optional';
  estimatedDurationMin: number;
  focus: string;
  exercises: ProgramExerciseTemplate[];
}

export interface ProgramPhase {
  id: string;
  label: string;
  weekStart: number;
  weekEnd: number;
  setDelta: number;
  repRangeShift: number;
}

export interface ProgramDefinition {
  id: string;
  name: string;
  weeks: number;
  dumbbellMaxLb: number;
  weightStepLb: number;
  primaryDaysPerWeek: number;
  phases: ProgramPhase[];
  days: ProgramDayTemplate[];
}

export interface ProgramExerciseLog {
  exerciseId: string;
  targetWeightLb: number;
  repRange: ProgramRepRange;
  setsTarget: number;
  unilateral: boolean;
  repsCompleted: Array<number | null>;
  skippedSetIndexes: number[];
  recommendation: string;
}

export interface ProgramSessionLog {
  id: string;
  programId: string;
  completedAt: string;
  week: number;
  sessionNumber: number;
  dayId: string;
  dayLabel: string;
  optionalDay: boolean;
  durationActualSec: number;
  skippedExerciseIds: string[];
  exercises: ProgramExerciseLog[];
}

export interface ExerciseProgressTarget {
  targetWeightLb: number;
  repRange: ProgramRepRange;
  previousReps: number[];
  recommendation: string;
  nextSessionTarget: string;
}

const PRIMARY_DAYS: ProgramDayTemplate[] = [
  {
    id: 'day-1',
    label: 'Day 1 - Chest + Shoulders',
    kind: 'primary',
    estimatedDurationMin: 55,
    focus: 'Horizontal press, overhead press, lateral delts, triceps',
    exercises: [
      { exerciseId: 'alternating-dumbbell-chest-press', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 35, restSec: 120 },
      { exerciseId: 'three-sec-pushup-hold', sets: 2, repRange: { min: 8, max: 12 }, startWeightLb: 0, restSec: 90, notes: 'Tempo emphasis' },
      { exerciseId: 'standing-dumbbell-shoulder-press', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 25, restSec: 105 },
      { exerciseId: 'heavy-dumbbell-lateral-raise', sets: 3, repRange: { min: 12, max: 18 }, startWeightLb: 15, restSec: 60 },
      { exerciseId: 'lying-oh-dumbbell-tricep-extension', sets: 3, repRange: { min: 10, max: 14 }, startWeightLb: 20, restSec: 75 },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2 - Back + Biceps',
    kind: 'primary',
    estimatedDurationMin: 55,
    focus: 'Rows, pullovers, rear delt and biceps work',
    exercises: [
      { exerciseId: 'single-arm-neutral-grip-row', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 35, restSec: 105 },
      { exerciseId: 'pause-dumbbell-pullover', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 30, restSec: 90 },
      { exerciseId: 'single-arm-bent-arm-raise', sets: 3, repRange: { min: 12, max: 18 }, startWeightLb: 12.5, restSec: 60 },
      { exerciseId: 'heavy-dumbbell-hammer-curl', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 25, restSec: 75 },
      { exerciseId: 'dumbbell-curl', sets: 2, repRange: { min: 10, max: 14 }, startWeightLb: 20, restSec: 60 },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3 - Legs + Abs',
    kind: 'primary',
    estimatedDurationMin: 58,
    focus: 'Single-leg work, hinge pattern, calves, loaded abs',
    exercises: [
      { exerciseId: 'reverse-lunge', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 20, restSec: 105 },
      { exerciseId: 'dumbbell-rdl', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 35, restSec: 120 },
      { exerciseId: 'goblet-squat', sets: 3, repRange: { min: 10, max: 14 }, startWeightLb: 35, restSec: 90 },
      { exerciseId: 'dumbbell-calf-raise', sets: 3, repRange: { min: 12, max: 20 }, startWeightLb: 25, restSec: 60 },
      { exerciseId: 'plank-drag-through', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 20, restSec: 75 },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4 - Chest + Shoulders',
    kind: 'primary',
    estimatedDurationMin: 55,
    focus: 'Second chest/shoulder session with extra lateral-delt emphasis',
    exercises: [
      { exerciseId: 'rotational-chest-press', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 30, restSec: 105 },
      { exerciseId: 'single-arm-dumbbell-chest-press', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 25, restSec: 90 },
      { exerciseId: 'arnold-press', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 20, restSec: 90 },
      { exerciseId: 'single-arm-lateral-raise', sets: 3, repRange: { min: 12, max: 18 }, startWeightLb: 12.5, restSec: 60 },
      { exerciseId: 'overhead-tricep-extension', sets: 2, repRange: { min: 10, max: 14 }, startWeightLb: 25, restSec: 75 },
    ],
  },
  {
    id: 'day-5',
    label: 'Day 5 - Back + Arms + Abs',
    kind: 'primary',
    estimatedDurationMin: 58,
    focus: 'Back and rear delts, biceps/triceps, progressive abs',
    exercises: [
      { exerciseId: 'dumbbell-row', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 35, restSec: 105 },
      { exerciseId: 'split-stance-rdl-rotational-row', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 25, restSec: 90 },
      { exerciseId: 'single-arm-front-raise', sets: 2, repRange: { min: 12, max: 16 }, startWeightLb: 12.5, restSec: 60 },
      { exerciseId: 'hammer-curl', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 22.5, restSec: 75 },
      { exerciseId: 'dumbbell-skull-crusher', sets: 3, repRange: { min: 8, max: 12 }, startWeightLb: 20, restSec: 75 },
      { exerciseId: 'alternating-db-standing-crunch', sets: 3, repRange: { min: 10, max: 14 }, startWeightLb: 20, restSec: 60 },
    ],
  },
];

const OPTIONAL_DAY: ProgramDayTemplate = {
  id: 'day-6-optional',
  label: 'Day 6 - Optional Recovery',
  kind: 'optional',
  estimatedDurationMin: 35,
  focus: 'Light conditioning, mobility, and easier full-body circulation',
  exercises: [
    { exerciseId: 'jumping-jack', sets: 3, repRange: { min: 20, max: 30 }, startWeightLb: 0, restSec: 30 },
    { exerciseId: 'world-greatest-stretch', sets: 2, repRange: { min: 6, max: 10 }, startWeightLb: 0, restSec: 30 },
    { exerciseId: 'cat-cow', sets: 2, repRange: { min: 8, max: 12 }, startWeightLb: 0, restSec: 20 },
    { exerciseId: 'offset-hold-march', sets: 2, repRange: { min: 10, max: 16 }, startWeightLb: 20, restSec: 45 },
  ],
};

export const HYPERTROPHY_PROGRAM: ProgramDefinition = {
  id: 'hypertrophy-12w-v1',
  name: '12-Week Hypertrophy',
  weeks: 12,
  dumbbellMaxLb: 50,
  weightStepLb: 5,
  primaryDaysPerWeek: 5,
  phases: [
    { id: 'accumulation', label: 'Base accumulation', weekStart: 1, weekEnd: 2, setDelta: 0, repRangeShift: 0 },
    { id: 'overload-1', label: 'Progressive overload I', weekStart: 3, weekEnd: 6, setDelta: 1, repRangeShift: 0 },
    { id: 'overload-2', label: 'Progressive overload II', weekStart: 7, weekEnd: 10, setDelta: 0, repRangeShift: -1 },
    { id: 'deload', label: 'Deload / reduced volume', weekStart: 11, weekEnd: 12, setDelta: -1, repRangeShift: 0 },
  ],
  days: [...PRIMARY_DAYS, OPTIONAL_DAY],
};

function phaseForWeek(program: ProgramDefinition, week: number): ProgramPhase {
  return (
    program.phases.find((phase) => week >= phase.weekStart && week <= phase.weekEnd) ??
    program.phases[program.phases.length - 1]
  );
}

export function getProgramDay(program: ProgramDefinition, dayId: string): ProgramDayTemplate | null {
  return program.days.find((day) => day.id === dayId) ?? null;
}

export function getScheduledPrimaryDay(program: ProgramDefinition, sessionCursor: number): ProgramDayTemplate {
  const primary = program.days.filter((day) => day.kind === 'primary');
  return primary[sessionCursor % primary.length];
}

function roundWeightToStep(weightLb: number, stepLb: number): number {
  if (weightLb <= 0) return 0;
  return Math.round(weightLb / stepLb) * stepLb;
}

function formatReps(reps: number[]): string {
  if (reps.length === 0) return 'No completed sets last time';
  return reps.join(' / ');
}

function topRangeHit(repRange: ProgramRepRange, reps: number[], setsTarget: number): boolean {
  if (reps.length < setsTarget) return false;
  const firstSets = reps.slice(0, setsTarget);
  return firstSets.every((rep) => rep >= repRange.max);
}

export function resolveExerciseTarget(params: {
  program: ProgramDefinition;
  template: ProgramExerciseTemplate;
  week: number;
  previousReps: number[];
  previousWeightLb?: number;
}): ExerciseProgressTarget {
  const { program, template, week, previousReps, previousWeightLb } = params;
  const phase = phaseForWeek(program, week);
  const targetWeightLb = roundWeightToStep(previousWeightLb ?? template.startWeightLb, program.weightStepLb);
  const shiftedMin = Math.max(5, template.repRange.min + phase.repRangeShift);
  const shiftedMax = Math.max(shiftedMin + 2, template.repRange.max + phase.repRangeShift);
  const repRange = { min: shiftedMin, max: shiftedMax };

  if (topRangeHit(repRange, previousReps, template.sets)) {
    if (targetWeightLb < program.dumbbellMaxLb) {
      const increased = Math.min(program.dumbbellMaxLb, targetWeightLb + program.weightStepLb);
      return {
        targetWeightLb: increased,
        repRange,
        previousReps,
        recommendation: `Previous ${formatReps(previousReps)} hit the top range. Increase to ${increased} lb and rebuild reps from ${repRange.min}+.`,
        nextSessionTarget: `${increased} lb x ${repRange.min}-${Math.max(repRange.min + 1, repRange.max - 2)}+`,
      };
    }
    return {
      targetWeightLb,
      repRange,
      previousReps,
      recommendation:
        `At the 50 lb ceiling. Keep ${targetWeightLb} lb and progress with slower eccentrics, pauses, and cleaner reps in ${repRange.min}-${repRange.max}.`,
      nextSessionTarget: `Stay ${targetWeightLb} lb and improve time-under-tension`,
    };
  }

  const prevTotal = previousReps.reduce((sum, rep) => sum + rep, 0);
  return {
    targetWeightLb,
    repRange,
    previousReps,
    recommendation:
      previousReps.length === 0
        ? `Start at ${targetWeightLb} lb and stay within ${repRange.min}-${repRange.max} reps.`
        : `Keep ${targetWeightLb} lb and beat last total of ${prevTotal} reps (${formatReps(previousReps)}).`,
    nextSessionTarget:
      previousReps.length === 0
        ? `${targetWeightLb} lb x ${repRange.min}-${repRange.max}`
        : `Keep ${targetWeightLb} lb and beat ${prevTotal} total reps`,
  };
}

export function adjustSetsForWeek(program: ProgramDefinition, week: number, baseSets: number): number {
  const phase = phaseForWeek(program, week);
  return Math.max(1, baseSets + phase.setDelta);
}

export function createProgramPlan(params: {
  program: ProgramDefinition;
  day: ProgramDayTemplate;
  week: number;
  sessionNumber: number;
  exerciseTargets: Record<string, ExerciseProgressTarget>;
  configTemplate?: ConfigInput;
}): WorkoutPlan {
  const { program, day, week, sessionNumber, exerciseTargets, configTemplate } = params;
  const createdAt = new Date().toISOString();
  const planId = `program:${program.id}:w${week}:s${sessionNumber}:${day.id}:${Date.now()}`;
  const items: PlanItem[] = day.exercises.map((exercise, idx) => {
    const target = exerciseTargets[exercise.exerciseId];
    const sets = adjustSetsForWeek(program, week, exercise.sets);
    return {
      id: `${day.id}:${exercise.exerciseId}:${idx}`,
      exerciseId: exercise.exerciseId,
      notes: exercise.notes,
      scheme: {
        kind: 'reps',
        reps: target?.repRange.min ?? exercise.repRange.min,
        sets,
        restSec: exercise.restSec,
      },
      programmed: {
        mode: 'hypertrophy',
        programId: program.id,
        week,
        dayId: day.id,
        dayLabel: day.label,
        prescribedWeightLb: target?.targetWeightLb ?? exercise.startWeightLb,
        repRange: target?.repRange ?? exercise.repRange,
        previousReps: target?.previousReps ?? [],
        recommendation: target?.recommendation,
        nextSessionTarget: target?.nextSessionTarget,
      },
    };
  });

  return {
    id: planId,
    createdAt,
    name: `${program.name} - Week ${week} - ${day.label}`,
    config: configTemplate ?? {
      durationMin: day.estimatedDurationMin,
      bodyParts: [],
      goal: 'hypertrophy',
      equipment: ['none', 'dumbbells'],
      style: 'straightSets',
      difficulty: 'intermediate',
      bodyweightRatio: 0.2,
    },
    blocks: [
      {
        id: 'main',
        kind: 'main',
        label: day.label,
        rounds: 1,
        interItemRestSec: 20,
        interRoundRestSec: 0,
        items,
      },
    ],
    estimatedDurationSec: day.estimatedDurationMin * 60,
    programSession: {
      programId: program.id,
      week,
      sessionNumber,
      dayId: day.id,
      dayLabel: day.label,
      optionalDay: day.kind === 'optional',
    },
  };
}

export function extractProgramReps(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

export function normalizeLoggedReps(log: ProgramExerciseLog | undefined): number[] {
  if (!log) return [];
  const reps = extractProgramReps(log.repsCompleted);
  if (!log.unilateral) return reps.slice(0, log.setsTarget);
  const normalized: number[] = [];
  for (let setIndex = 0; setIndex < log.setsTarget; setIndex++) {
    const right = reps[setIndex * 2];
    const left = reps[setIndex * 2 + 1];
    if (right == null && left == null) continue;
    if (right == null) normalized.push(left);
    else if (left == null) normalized.push(right);
    else normalized.push(Math.min(right, left));
  }
  return normalized;
}

export function buildProgramExerciseLookup(logs: ProgramSessionLog[]): Record<string, ProgramExerciseLog> {
  const lookup: Record<string, ProgramExerciseLog> = {};
  for (const session of logs) {
    for (const ex of session.exercises) {
      lookup[`${session.dayId}:${ex.exerciseId}`] = ex;
    }
  }
  return lookup;
}

export function ensureProgramExercisesExist(
  program: ProgramDefinition,
  exerciseById: ReadonlyMap<string, Exercise>,
): string[] {
  const missing = new Set<string>();
  for (const day of program.days) {
    for (const ex of day.exercises) {
      if (!exerciseById.has(ex.exerciseId)) {
        missing.add(ex.exerciseId);
      }
    }
  }
  return [...missing];
}
