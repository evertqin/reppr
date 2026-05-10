/**
 * Typed wrapper around localStorage with versioned keys and a tiny migration hook.
 */
export interface VersionedKey<T> {
  key: string;
  version: number;
  validate: (data: unknown) => data is T;
}

export function readKey<T>(k: VersionedKey<T>): T | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(k.key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: number; data?: unknown };
    if (parsed.v !== k.version) return null;
    if (!k.validate(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeKey<T>(k: VersionedKey<T>, data: T): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(k.key, JSON.stringify({ v: k.version, data }));
}

export function removeKey<T>(k: VersionedKey<T>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(k.key);
}
