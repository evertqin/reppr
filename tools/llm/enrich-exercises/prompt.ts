export const SYSTEM_PROMPT = `You author exercise metadata for the reppr workout generator.
You will receive a JSON description of a subset of the current exercise library and a strict JSON schema (TypeScript types).
Your job: return a single JSON object that conforms exactly to the EnrichmentDoc schema, providing only fields you are improving or adding. Never invent equipment requirements. Cues must be <= 8 words, imperative.
Return JSON ONLY. No prose. No markdown fences.`;

export function buildUserPrompt(args: {
  schemaTypes: string;
  librarySubset: unknown;
  fields: string[];
  newCount: number;
}): string {
  return [
    'Schema (TypeScript):',
    '```ts',
    args.schemaTypes,
    '```',
    '',
    'Current library (subset):',
    '```json',
    JSON.stringify(args.librarySubset, null, 2),
    '```',
    '',
    `Fill these fields where missing: ${args.fields.join(', ')}.`,
    args.newCount > 0
      ? `Additionally propose ${args.newCount} brand-new exercises filling gaps in muscle/equipment coverage.`
      : 'Do not invent new exercises in this run.',
    '',
    'Return a single JSON object: { "schemaVersion": 1, "source": "<short>", "exercises": [...] }.',
  ].join('\n');
}
