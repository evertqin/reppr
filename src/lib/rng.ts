/**
 * Tiny seedable PRNG (mulberry32). No I/O. No globals. Deterministic.
 */
export interface Rng {
  next(): number; // [0, 1)
  pick<T>(arr: readonly T[]): T;
  range(min: number, max: number): number; // integer inclusive
  shuffle<T>(arr: readonly T[]): T[];
  uuid(): string;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[Math.floor(next() * arr.length)];
  }
  function range(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }
  function shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function uuid(): string {
    // RFC4122-ish v4 from PRNG (deterministic; not cryptographically random by design).
    const bytes = new Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(next() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return { next, pick, range, shuffle, uuid };
}
