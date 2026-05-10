import { describe, it, expect } from 'vitest';
import { validateExportBundle } from '../src/storage/exportImport';
import { readKey, writeKey, removeKey } from '../src/storage/local';

describe('validateExportBundle', () => {
  it('rejects non-objects', () => {
    expect(() => validateExportBundle(null)).toThrow();
    expect(() => validateExportBundle('hi')).toThrow();
  });

  it('rejects wrong schemaVersion', () => {
    expect(() =>
      validateExportBundle({ schemaVersion: 99, plans: [], sessions: [] }),
    ).toThrow(/schemaVersion/);
  });

  it('accepts a minimal valid bundle', () => {
    const b = validateExportBundle({ schemaVersion: 1, plans: [], sessions: [] });
    expect(b.plans).toEqual([]);
    expect(b.sessions).toEqual([]);
  });

  it('rejects malformed plan entries', () => {
    expect(() =>
      validateExportBundle({ schemaVersion: 1, plans: [{ name: 'oops' }], sessions: [] }),
    ).toThrow();
  });
});

describe('local storage adapter', () => {
  const key = {
    key: 'reppr:test:v1',
    version: 1,
    validate: (x: unknown): x is { n: number } => typeof (x as { n?: unknown })?.n === 'number',
  };

  it('round-trips a value', () => {
    writeKey(key, { n: 42 });
    expect(readKey(key)).toEqual({ n: 42 });
    removeKey(key);
    expect(readKey(key)).toBeNull();
  });

  it('returns null on version mismatch', () => {
    localStorage.setItem(key.key, JSON.stringify({ v: 99, data: { n: 1 } }));
    expect(readKey(key)).toBeNull();
    removeKey(key);
  });
});
