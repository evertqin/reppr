import type { Exercise, PlanItem, WorkoutPlan } from '../../domain/types';

/**
 * A flat sequence of work/rest steps the player walks through.
 * Pre-computed from a WorkoutPlan; the reducer only needs to advance an index.
 */
export interface WorkStep {
  kind: 'work';
  blockIndex: number;
  /** 1-based round inside the block. */
  round: number;
  /** Index of the PlanItem within the block. */
  itemIndex: number;
  exerciseId: string;
  /** Either reps target or seconds target. */
  reps?: number;
  durationSec?: number;
}

export interface RestStep {
  kind: 'rest';
  blockIndex: number;
  round: number;
  /** "inter-item" rest follows an item; "inter-round" rest follows the last item of a round. */
  scope: 'item' | 'round' | 'block';
  durationSec: number;
}

export type Step = WorkStep | RestStep;

export interface PlayerState {
  status: 'idle' | 'countdown' | 'work' | 'rest' | 'paused' | 'finished';
  /** When paused, what to resume to ('work' or 'rest'). */
  resumeStatus: 'work' | 'rest' | null;
  steps: Step[];
  stepIndex: number;
  /** Time elapsed within the current step, in ms. */
  elapsedMs: number;
  /** Countdown seconds remaining (3..1). */
  countdown: number;
  /** Reps completed in the current work step (rep-based). */
  repsDone: number;
  /** True once finished. */
  done: boolean;
}

export type PlayerEvent =
  | { type: 'start' }
  | { type: 'tick'; deltaMs: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'skipForward' }
  | { type: 'skipBack' }
  | { type: 'repComplete' }
  | { type: 'abort' }
  | { type: 'setSteps'; steps: Step[] };

export function buildSteps(plan: WorkoutPlan, byId: ReadonlyMap<string, Exercise>): Step[] {
  const steps: Step[] = [];
  plan.blocks.forEach((block, blockIndex) => {
    for (let r = 1; r <= block.rounds; r++) {
      block.items.forEach((item: PlanItem, itemIndex) => {
        const ex = byId.get(item.exerciseId);
        if (item.scheme.kind === 'time') {
          // Each set within the item becomes one work + within-item rest pair.
          for (let s = 0; s < item.scheme.sets; s++) {
            steps.push({
              kind: 'work',
              blockIndex,
              round: r,
              itemIndex,
              exerciseId: item.exerciseId,
              durationSec: item.scheme.workSec,
            });
            if (s < item.scheme.sets - 1 && item.scheme.restSec > 0) {
              steps.push({
                kind: 'rest',
                blockIndex,
                round: r,
                scope: 'item',
                durationSec: item.scheme.restSec,
              });
            }
          }
        } else {
          for (let s = 0; s < item.scheme.sets; s++) {
            steps.push({
              kind: 'work',
              blockIndex,
              round: r,
              itemIndex,
              exerciseId: item.exerciseId,
              reps: item.scheme.reps,
              durationSec: ex ? ex.tempoSecPerRep * item.scheme.reps : item.scheme.reps * 3,
            });
            if (s < item.scheme.sets - 1 && item.scheme.restSec > 0) {
              steps.push({
                kind: 'rest',
                blockIndex,
                round: r,
                scope: 'item',
                durationSec: item.scheme.restSec,
              });
            }
          }
        }
        // Inter-item rest (skip after last item of a round).
        if (itemIndex < block.items.length - 1 && block.interItemRestSec > 0) {
          steps.push({
            kind: 'rest',
            blockIndex,
            round: r,
            scope: 'item',
            durationSec: block.interItemRestSec,
          });
        }
      });
      if (r < block.rounds && block.interRoundRestSec > 0) {
        steps.push({
          kind: 'rest',
          blockIndex,
          round: r,
          scope: 'round',
          durationSec: block.interRoundRestSec,
        });
      }
    }
    if (blockIndex < plan.blocks.length - 1) {
      steps.push({
        kind: 'rest',
        blockIndex,
        round: 1,
        scope: 'block',
        durationSec: 10,
      });
    }
  });
  return steps;
}

export function initialState(steps: Step[]): PlayerState {
  return {
    status: 'idle',
    resumeStatus: null,
    steps,
    stepIndex: 0,
    elapsedMs: 0,
    countdown: 0,
    repsDone: 0,
    done: false,
  };
}

function currentStepDurationMs(state: PlayerState): number {
  const step = state.steps[state.stepIndex];
  if (!step) return 0;
  return (step.durationSec ?? 0) * 1000;
}

function advance(state: PlayerState): PlayerState {
  const next = state.stepIndex + 1;
  if (next >= state.steps.length) {
    return { ...state, status: 'finished', done: true, elapsedMs: 0, repsDone: 0 };
  }
  const nextStep = state.steps[next];
  return {
    ...state,
    stepIndex: next,
    status: nextStep.kind === 'work' ? 'work' : 'rest',
    elapsedMs: 0,
    repsDone: 0,
  };
}

function rewind(state: PlayerState): PlayerState {
  const prev = Math.max(0, state.stepIndex - 1);
  const prevStep = state.steps[prev];
  return {
    ...state,
    stepIndex: prev,
    status: prevStep.kind === 'work' ? 'work' : 'rest',
    elapsedMs: 0,
    repsDone: 0,
    done: false,
  };
}

export function reducer(state: PlayerState, event: PlayerEvent): PlayerState {
  switch (event.type) {
    case 'start': {
      if (state.status !== 'idle' && state.status !== 'finished') return state;
      if (state.steps.length === 0) return { ...state, status: 'finished', done: true };
      return {
        ...state,
        status: 'countdown',
        countdown: 3,
        stepIndex: 0,
        elapsedMs: 0,
        repsDone: 0,
        done: false,
      };
    }
    case 'tick': {
      if (state.status === 'paused' || state.status === 'idle' || state.status === 'finished') {
        return state;
      }
      const next = { ...state, elapsedMs: state.elapsedMs + event.deltaMs };
      if (next.status === 'countdown') {
        const remaining = 3 - Math.floor(next.elapsedMs / 1000);
        if (remaining <= 0) {
          const first = state.steps[0];
          return {
            ...next,
            status: first.kind === 'work' ? 'work' : 'rest',
            elapsedMs: 0,
            countdown: 0,
          };
        }
        return { ...next, countdown: remaining };
      }
      const total = currentStepDurationMs(next);
      const step = state.steps[state.stepIndex];
      // Rep-based work steps don't auto-advance unless time exceeds 1.5x estimated duration.
      const isRepWork = step.kind === 'work' && step.reps != null;
      const cap = isRepWork ? total * 1.5 : total;
      if (cap > 0 && next.elapsedMs >= cap) {
        return advance(next);
      }
      return next;
    }
    case 'pause': {
      if (state.status === 'work' || state.status === 'rest') {
        return { ...state, status: 'paused', resumeStatus: state.status };
      }
      return state;
    }
    case 'resume': {
      if (state.status === 'paused' && state.resumeStatus) {
        return { ...state, status: state.resumeStatus, resumeStatus: null };
      }
      return state;
    }
    case 'skipForward':
      if (state.status === 'idle' || state.status === 'finished') return state;
      return advance(state);
    case 'skipBack':
      if (state.status === 'idle') return state;
      return rewind({ ...state, status: state.status === 'finished' ? 'work' : state.status });
    case 'repComplete': {
      const step = state.steps[state.stepIndex];
      if (state.status !== 'work' || step?.kind !== 'work' || step.reps == null) return state;
      const repsDone = state.repsDone + 1;
      if (repsDone >= step.reps) return advance(state);
      return { ...state, repsDone };
    }
    case 'abort':
      return { ...initialState(state.steps), status: 'finished', done: true };
    case 'setSteps':
      return initialState(event.steps);
    default:
      return state;
  }
}
