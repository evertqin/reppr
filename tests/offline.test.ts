import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generatePlan } from '../src/features/generator';
import { buildLibrary } from '../src/data/exercises';

describe('offline guarantee', () => {
  let originalFetch: typeof fetch | undefined;
  let originalXhr: typeof XMLHttpRequest | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalXhr = globalThis.XMLHttpRequest;
    vi.stubGlobal('fetch', () => {
      throw new Error('Offline test: fetch is forbidden.');
    });
    vi.stubGlobal(
      'XMLHttpRequest',
      class {
        constructor() {
          throw new Error('Offline test: XMLHttpRequest is forbidden.');
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalFetch) globalThis.fetch = originalFetch;
    if (originalXhr) globalThis.XMLHttpRequest = originalXhr;
  });

  it('library + generator work without network access', () => {
    const lib = buildLibrary();
    const plan = generatePlan(
      {
        durationMin: 20,
        bodyParts: [],
        goal: 'hypertrophy',
        equipment: ['none'],
        style: 'circuit',
        difficulty: 'intermediate',
      },
      lib,
    );
    expect(plan.blocks.length).toBeGreaterThan(0);
  });
});
