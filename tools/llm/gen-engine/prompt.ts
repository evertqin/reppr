export const SYSTEM_PROMPT = `You are a senior TypeScript engineer.
You will receive a specification, the exact TypeScript types, and a representative test snippet.
Your job: emit ONE TypeScript module body that implements the specified generator and passes the tests.
HARD RULES:
- Return TypeScript source ONLY. No prose. No markdown fences.
- Imports allowed only from '../../domain/types' (types) and '../../lib/rng' (Rng helpers).
- No 'any'. No 'fetch'. No 'process'. No 'globalThis'. No 'Date.now'. No 'Math.random'.
- The module must export 'generatePlan' and 'estimateDurationSec'.
- Pure functions only. No side effects, no I/O.
`;

export function buildUserPrompt(args: {
  spec: string;
  types: string;
  testSubset: string;
}): string {
  return [
    'Specification:',
    args.spec,
    '',
    'Domain types (exact, do not redeclare):',
    '```ts',
    args.types,
    '```',
    '',
    'Representative test contract:',
    '```ts',
    args.testSubset,
    '```',
    '',
    'Emit the module body now.',
  ].join('\n');
}
