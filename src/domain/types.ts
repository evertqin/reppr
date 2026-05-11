export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'fullBody';

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'fullBody',
];

/**
 * Compound classification used by the generator to enforce a sensible split of
 * exercises per session: a few from the BIG muscles (heavy compounds), 1-2
 * from the SMALL muscles (isolation), and AUX rounds out the session.
 */
export type MuscleGroupTier = 'big' | 'small' | 'aux';

export const MUSCLE_GROUP_TIER: Record<MuscleGroup, MuscleGroupTier> = {
  // BIG: heavy compound movements
  chest: 'big',
  back: 'big',
  quads: 'big',
  hamstrings: 'big',
  glutes: 'big',
  fullBody: 'big',
  // SMALL: arms + shoulders
  shoulders: 'small',
  biceps: 'small',
  triceps: 'small',
  // AUX: trunk + lower-leg, and anything that's effectively a finisher
  core: 'aux',
  calves: 'aux',
};

export type Equipment = 'none' | 'dumbbells' | 'bands' | 'pullupBar' | 'bench' | 'barbell';
export const ALL_EQUIPMENT: Equipment[] = [
  'none',
  'dumbbells',
  'bands',
  'pullupBar',
  'bench',
  'barbell',
];

export type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'fatLoss' | 'mobility';
export const ALL_GOALS: Goal[] = ['strength', 'hypertrophy', 'endurance', 'fatLoss', 'mobility'];

export type Style = 'straightSets' | 'circuit' | 'hiit' | 'tabata';
export const ALL_STYLES: Style[] = ['straightSets', 'circuit', 'hiit', 'tabata'];

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export const ALL_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export type BlockKind = 'warmup' | 'main' | 'cooldown';

export type Scheme =
  | { kind: 'reps'; reps: number; sets: number; restSec: number }
  | { kind: 'time'; workSec: number; sets: number; restSec: number };

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  isWarmup?: boolean;
  isCooldown?: boolean;
  unilateral?: boolean;
  animationKey: string;
  cues: string[];
  instructions: string[];
  tempoSecPerRep: number;
  defaultScheme: Scheme;
  alternateExerciseIds?: string[];
  tags?: string[];
}

export interface PlanItem {
  id: string;
  exerciseId: string;
  scheme: Scheme;
  notes?: string;
}

export interface PlanBlock {
  id: string;
  kind: BlockKind;
  label: string;
  rounds: number;
  items: PlanItem[];
  interItemRestSec: number;
  interRoundRestSec: number;
}

export interface ConfigInput {
  durationMin: number;
  bodyParts: MuscleGroup[];
  goal: Goal;
  equipment: Equipment[];
  style: Style;
  difficulty: Difficulty;
  /**
   * Target share of *main-block* exercises that should be bodyweight-only
   * (equipment === ['none']), expressed 0..1. Ignored when no other equipment
   * is selected. Defaults to 0.5 when omitted.
   */
  bodyweightRatio?: number;
}

export interface WorkoutPlan {
  id: string;
  createdAt: string;
  name: string;
  config: ConfigInput;
  blocks: PlanBlock[];
  estimatedDurationSec: number;
}

export interface CompletedSession {
  id: string;
  planId: string;
  completedAt: string;
  durationActualSec: number;
  skippedItemIds: string[];
}
