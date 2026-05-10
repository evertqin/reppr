import type {
  Difficulty,
  Equipment,
  Exercise,
  MuscleGroup,
} from '../domain/types';
import { SEED_EXERCISES } from './exercises.seed';
import { mergeEnrichments, type EnrichmentDoc } from './enrichmentSchema';

const bundled = import.meta.glob<EnrichmentDoc>('./enrichments/*.json', {
  eager: true,
  import: 'default',
});

export function buildLibrary(userEnrichments: EnrichmentDoc[] = []): Exercise[] {
  const docs: EnrichmentDoc[] = [...Object.values(bundled), ...userEnrichments];
  return mergeEnrichments(SEED_EXERCISES, docs, { warnOnConflict: import.meta.env?.DEV });
}

export const EXERCISES: readonly Exercise[] = buildLibrary();
export const EXERCISE_BY_ID: ReadonlyMap<string, Exercise> = new Map(
  EXERCISES.map((e) => [e.id, e]),
);

export interface FindFilter {
  muscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  warmup?: boolean;
  cooldown?: boolean;
}

/**
 * Filter the library. Pure; the user enrichments must be applied via buildLibrary first.
 */
export function findExercises(
  library: readonly Exercise[] = EXERCISES,
  filter: FindFilter = {},
): Exercise[] {
  return library.filter((ex) => {
    if (filter.warmup === true && !ex.isWarmup) return false;
    if (filter.warmup === false && ex.isWarmup) return false;
    if (filter.cooldown === true && !ex.isCooldown) return false;
    if (filter.cooldown === false && ex.isCooldown) return false;
    if (filter.difficulty && ex.difficulty !== filter.difficulty) return false;
    if (filter.equipment && filter.equipment.length > 0) {
      const allowed = new Set(filter.equipment);
      const ok = ex.equipment.every((e) => allowed.has(e));
      if (!ok) return false;
    }
    if (filter.muscles && filter.muscles.length > 0) {
      const want = new Set(filter.muscles);
      const matches = ex.primaryMuscles.some((m) => want.has(m)) ||
        ex.secondaryMuscles.some((m) => want.has(m)) ||
        ex.primaryMuscles.includes('fullBody');
      if (!matches) return false;
    }
    return true;
  });
}
