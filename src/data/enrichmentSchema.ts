import type {
  Difficulty,
  Equipment,
  Exercise,
  MuscleGroup,
  Scheme,
} from '../domain/types';
import {
  ALL_DIFFICULTIES,
  ALL_EQUIPMENT,
  ALL_MUSCLE_GROUPS,
} from '../domain/types';

export interface EnrichmentEntry {
  id: string;
  name?: string;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  isWarmup?: boolean;
  isCooldown?: boolean;
  unilateral?: boolean;
  animationKey?: string;
  cues?: string[];
  instructions?: string[];
  tempoSecPerRep?: number;
  defaultScheme?: Scheme;
  alternateExerciseIds?: string[];
  tags?: string[];
}

export interface EnrichmentDoc {
  schemaVersion: 1;
  source?: string;
  exercises: EnrichmentEntry[];
}

const MUSCLE_SET = new Set<string>(ALL_MUSCLE_GROUPS);
const EQUIPMENT_SET = new Set<string>(ALL_EQUIPMENT);
const DIFFICULTY_SET = new Set<string>(ALL_DIFFICULTIES);

class ParseError extends Error {}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function ensureMuscles(field: string, v: unknown): MuscleGroup[] {
  if (!Array.isArray(v)) throw new ParseError(`${field}: expected array of muscle groups`);
  for (const x of v) {
    if (typeof x !== 'string' || !MUSCLE_SET.has(x)) {
      throw new ParseError(`${field}: unknown muscle group "${String(x)}"`);
    }
  }
  return v as MuscleGroup[];
}

function ensureEquipment(field: string, v: unknown): Equipment[] {
  if (!Array.isArray(v)) throw new ParseError(`${field}: expected array of equipment`);
  for (const x of v) {
    if (typeof x !== 'string' || !EQUIPMENT_SET.has(x)) {
      throw new ParseError(`${field}: unknown equipment "${String(x)}"`);
    }
  }
  return v as Equipment[];
}

function ensureDifficulty(field: string, v: unknown): Difficulty {
  if (typeof v !== 'string' || !DIFFICULTY_SET.has(v)) {
    throw new ParseError(`${field}: invalid difficulty "${String(v)}"`);
  }
  return v as Difficulty;
}

function ensureScheme(field: string, v: unknown): Scheme {
  if (!v || typeof v !== 'object') throw new ParseError(`${field}: scheme must be an object`);
  const o = v as Record<string, unknown>;
  if (o.kind === 'reps') {
    if (
      typeof o.reps !== 'number' ||
      typeof o.sets !== 'number' ||
      typeof o.restSec !== 'number'
    ) {
      throw new ParseError(`${field}: reps scheme requires reps, sets, restSec numbers`);
    }
    return { kind: 'reps', reps: o.reps, sets: o.sets, restSec: o.restSec };
  }
  if (o.kind === 'time') {
    if (
      typeof o.workSec !== 'number' ||
      typeof o.sets !== 'number' ||
      typeof o.restSec !== 'number'
    ) {
      throw new ParseError(`${field}: time scheme requires workSec, sets, restSec numbers`);
    }
    return { kind: 'time', workSec: o.workSec, sets: o.sets, restSec: o.restSec };
  }
  throw new ParseError(`${field}: scheme.kind must be 'reps' or 'time'`);
}

function parseEntry(raw: unknown, idx: number): EnrichmentEntry {
  if (!raw || typeof raw !== 'object') {
    throw new ParseError(`exercises[${idx}]: must be an object`);
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) {
    throw new ParseError(`exercises[${idx}]: id is required`);
  }
  const e: EnrichmentEntry = { id: o.id };
  const path = `exercises[${idx}]`;
  if (o.name !== undefined) {
    if (typeof o.name !== 'string') throw new ParseError(`${path}.name must be string`);
    e.name = o.name;
  }
  if (o.primaryMuscles !== undefined) e.primaryMuscles = ensureMuscles(`${path}.primaryMuscles`, o.primaryMuscles);
  if (o.secondaryMuscles !== undefined) e.secondaryMuscles = ensureMuscles(`${path}.secondaryMuscles`, o.secondaryMuscles);
  if (o.equipment !== undefined) e.equipment = ensureEquipment(`${path}.equipment`, o.equipment);
  if (o.difficulty !== undefined) e.difficulty = ensureDifficulty(`${path}.difficulty`, o.difficulty);
  if (o.isWarmup !== undefined) {
    if (typeof o.isWarmup !== 'boolean') throw new ParseError(`${path}.isWarmup must be boolean`);
    e.isWarmup = o.isWarmup;
  }
  if (o.isCooldown !== undefined) {
    if (typeof o.isCooldown !== 'boolean') throw new ParseError(`${path}.isCooldown must be boolean`);
    e.isCooldown = o.isCooldown;
  }
  if (o.unilateral !== undefined) {
    if (typeof o.unilateral !== 'boolean') throw new ParseError(`${path}.unilateral must be boolean`);
    e.unilateral = o.unilateral;
  }
  if (o.animationKey !== undefined) {
    if (typeof o.animationKey !== 'string') throw new ParseError(`${path}.animationKey must be string`);
    e.animationKey = o.animationKey;
  }
  if (o.cues !== undefined) {
    if (!isStringArray(o.cues)) throw new ParseError(`${path}.cues must be string[]`);
    e.cues = o.cues;
  }
  if (o.instructions !== undefined) {
    if (!isStringArray(o.instructions)) throw new ParseError(`${path}.instructions must be string[]`);
    e.instructions = o.instructions;
  }
  if (o.tempoSecPerRep !== undefined) {
    if (typeof o.tempoSecPerRep !== 'number') throw new ParseError(`${path}.tempoSecPerRep must be number`);
    e.tempoSecPerRep = o.tempoSecPerRep;
  }
  if (o.defaultScheme !== undefined) e.defaultScheme = ensureScheme(`${path}.defaultScheme`, o.defaultScheme);
  if (o.alternateExerciseIds !== undefined) {
    if (!isStringArray(o.alternateExerciseIds)) throw new ParseError(`${path}.alternateExerciseIds must be string[]`);
    e.alternateExerciseIds = o.alternateExerciseIds;
  }
  if (o.tags !== undefined) {
    if (!isStringArray(o.tags)) throw new ParseError(`${path}.tags must be string[]`);
    e.tags = o.tags;
  }
  return e;
}

/**
 * Validates and returns a normalized EnrichmentDoc. Throws on any schema violation.
 */
export function parseEnrichment(input: unknown): EnrichmentDoc {
  if (!input || typeof input !== 'object') {
    throw new ParseError('Enrichment must be an object');
  }
  const o = input as Record<string, unknown>;
  if (o.schemaVersion !== 1) throw new ParseError('Enrichment.schemaVersion must be 1');
  if (!Array.isArray(o.exercises)) throw new ParseError('Enrichment.exercises must be an array');
  const exercises = o.exercises.map((raw, i) => parseEntry(raw, i));
  return {
    schemaVersion: 1,
    source: typeof o.source === 'string' ? o.source : undefined,
    exercises,
  };
}

interface MergeOptions {
  /** When true, log conflicts to console (dev only). */
  warnOnConflict?: boolean;
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === 'string' && v.length === 0) return true;
  return false;
}

/**
 * Merge enrichments into the seed library.
 *
 * Rules:
 *  - New `id` -> added in full (must validate as a complete Exercise; throws if missing required fields).
 *  - Existing `id`, seed field is empty/missing -> enrichment fills it.
 *  - Existing `id`, seed field is populated -> enrichment IGNORED for that field (seed wins).
 */
export function mergeEnrichments(
  seed: readonly Exercise[],
  docs: readonly EnrichmentDoc[],
  options: MergeOptions = {},
): Exercise[] {
  const result = new Map<string, Exercise>(seed.map((e) => [e.id, { ...e }]));
  const conflicts: string[] = [];

  for (const doc of docs) {
    for (const entry of doc.exercises) {
      const existing = result.get(entry.id);
      if (!existing) {
        const built = buildNewExercise(entry);
        result.set(entry.id, built);
        continue;
      }
      const merged: Exercise = { ...existing };
      let mutated = false;
      const fields: (keyof EnrichmentEntry)[] = [
        'name',
        'primaryMuscles',
        'secondaryMuscles',
        'equipment',
        'difficulty',
        'isWarmup',
        'isCooldown',
        'unilateral',
        'animationKey',
        'cues',
        'instructions',
        'tempoSecPerRep',
        'defaultScheme',
        'alternateExerciseIds',
        'tags',
      ];
      for (const f of fields) {
        const incoming = entry[f];
        if (incoming === undefined) continue;
        const seedVal = (existing as unknown as Record<string, unknown>)[f as string];
        if (isEmpty(seedVal)) {
          (merged as unknown as Record<string, unknown>)[f as string] = incoming as unknown;
          mutated = true;
        } else if (JSON.stringify(seedVal) !== JSON.stringify(incoming)) {
          conflicts.push(`${entry.id}.${String(f)} (seed wins)`);
        }
      }
      if (mutated) result.set(entry.id, merged);
    }
  }

  if (options.warnOnConflict && conflicts.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('[reppr] enrichment conflicts (seed wins):', conflicts);
  }

  return Array.from(result.values());
}

function buildNewExercise(entry: EnrichmentEntry): Exercise {
  const required: (keyof EnrichmentEntry)[] = [
    'name',
    'primaryMuscles',
    'equipment',
    'difficulty',
    'animationKey',
    'tempoSecPerRep',
    'defaultScheme',
  ];
  const missing = required.filter((f) => entry[f] === undefined);
  if (missing.length > 0) {
    throw new ParseError(
      `New exercise "${entry.id}" missing required fields: ${missing.join(', ')}`,
    );
  }
  return {
    id: entry.id,
    name: entry.name as string,
    primaryMuscles: entry.primaryMuscles as MuscleGroup[],
    secondaryMuscles: entry.secondaryMuscles ?? [],
    equipment: entry.equipment as Equipment[],
    difficulty: entry.difficulty as Difficulty,
    isWarmup: entry.isWarmup,
    isCooldown: entry.isCooldown,
    unilateral: entry.unilateral,
    animationKey: entry.animationKey as string,
    cues: entry.cues ?? [],
    instructions: entry.instructions ?? [],
    tempoSecPerRep: entry.tempoSecPerRep as number,
    defaultScheme: entry.defaultScheme as Scheme,
    alternateExerciseIds: entry.alternateExerciseIds,
    tags: entry.tags,
  };
}

export { ParseError };
