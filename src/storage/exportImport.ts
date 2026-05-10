import type { CompletedSession, WorkoutPlan } from '../domain/types';

export interface ExportBundle {
  schemaVersion: 1;
  exportedAt: string;
  plans: WorkoutPlan[];
  sessions: CompletedSession[];
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

function validatePlan(p: unknown): p is WorkoutPlan {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.name === 'string' &&
    typeof o.estimatedDurationSec === 'number' &&
    Array.isArray(o.blocks) &&
    typeof o.config === 'object'
  );
}

function validateSession(s: unknown): s is CompletedSession {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.planId === 'string' &&
    typeof o.completedAt === 'string' &&
    typeof o.durationActualSec === 'number' &&
    isStringArray(o.skippedItemIds)
  );
}

export function validateExportBundle(input: unknown): ExportBundle {
  if (!input || typeof input !== 'object') throw new Error('Invalid export: not an object');
  const o = input as Record<string, unknown>;
  if (o.schemaVersion !== 1) throw new Error(`Unsupported schemaVersion: ${String(o.schemaVersion)}`);
  if (!Array.isArray(o.plans) || !o.plans.every(validatePlan)) {
    throw new Error('Invalid export: plans');
  }
  if (!Array.isArray(o.sessions) || !o.sessions.every(validateSession)) {
    throw new Error('Invalid export: sessions');
  }
  return {
    schemaVersion: 1,
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : new Date().toISOString(),
    plans: o.plans,
    sessions: o.sessions,
  };
}
