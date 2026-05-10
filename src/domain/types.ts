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
