import { describe, it, expect } from 'vitest';
import { useEnrichmentStore } from '../src/storage/enrichments';
import { parseEnrichment } from '../src/data/enrichmentSchema';
import { buildLibrary } from '../src/data/exercises';

describe('user enrichments storage', () => {
  it('round-trips a doc through the store and merges into library', () => {
    const doc = parseEnrichment({
      schemaVersion: 1,
      source: 'unit-test',
      exercises: [
        { id: 'pushup', tags: ['unit-test'] },
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
    });
    useEnrichmentStore.getState().addSource({
      id: 'unit-test',
      name: 'unit-test',
      importedAt: new Date().toISOString(),
      enabled: true,
      doc,
    });

    const lib = buildLibrary([doc]);
    const wallSit = lib.find((e) => e.id === 'wall-sit');
    const pushup = lib.find((e) => e.id === 'pushup');
    expect(wallSit).toBeDefined();
    expect(pushup?.tags).toContain('unit-test');

    useEnrichmentStore.getState().removeSource('unit-test');
  });

  it('rejects malformed input via parseEnrichment', () => {
    expect(() => parseEnrichment({ schemaVersion: 1, exercises: [{}] })).toThrow();
  });
});
