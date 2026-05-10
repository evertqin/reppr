#!/usr/bin/env node
/**
 * Dev-time CLI: produce a portable enrichment file by querying an LLM.
 * The browser app does not (and must not) import anything from this folder.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_EXERCISES } from '../../../src/data/exercises.seed';
import { parseEnrichment } from '../../../src/data/enrichmentSchema';
import { getProvider } from '../shared/provider';
import { withFixtures, fixtureMode } from '../shared/fixture';
import { requireJsonObject } from '../shared/prompt';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';

interface Args {
  provider: string;
  model: string;
  ids?: string[];
  newCount: number;
  fields: string[];
  format: 'json' | 'csv';
  out?: string;
  dryRun: boolean;
  audit?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    provider: process.env.LLM_PROVIDER ?? 'openai',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
    newCount: 0,
    fields: ['cues', 'instructions', 'secondaryMuscles', 'tags', 'alternateExerciseIds'],
    format: 'json',
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--provider': args.provider = next(); break;
      case '--model': args.model = next(); break;
      case '--ids': args.ids = next().split(','); break;
      case '--new': args.newCount = Number(next()); break;
      case '--fields': args.fields = next().split(','); break;
      case '--format': args.format = next() as 'json' | 'csv'; break;
      case '--out': args.out = next(); break;
      case '--audit': args.audit = next(); break;
      case '--dry-run': args.dryRun = true; break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: tsx tools/llm/enrich-exercises/index.ts [flags]
  --provider openai|anthropic     (default: env LLM_PROVIDER or openai)
  --model <id>                     (default: env LLM_MODEL or gpt-4o-mini)
  --ids <csv>                      Limit to these exercise ids
  --new <n>                        Ask for N brand-new exercises
  --fields <csv>                   Fields to fill (default cues,instructions,secondaryMuscles,tags,alternateExerciseIds)
  --format json|csv                (default json)
  --out <path>                     (default src/data/enrichments/llm-<ts>.json)
  --dry-run                        Print to stdout, do not write
  --audit <path>                   Write a JSON audit log of the run
LLM_FIXTURE=record|replay          Use fixtures (CI uses replay)`);
}

function pickSubset(ids?: string[]) {
  return ids
    ? SEED_EXERCISES.filter((e) => ids.includes(e.id))
    : SEED_EXERCISES.filter(
        (e) =>
          e.cues.length === 0 || e.instructions.length === 0 || e.secondaryMuscles.length === 0,
      );
}

function readSchemaTypes(): string {
  const here = fileURLToPath(import.meta.url);
  const schemaPath = resolve(dirname(here), '../../../src/data/enrichmentSchema.ts');
  if (!existsSync(schemaPath)) return '';
  const src = readFileSync(schemaPath, 'utf8');
  // grab just the EnrichmentDoc/EnrichmentEntry type declarations
  const m = src.match(/export interface EnrichmentDoc[\s\S]*?(?=\n\s*export function|\n\s*function )/);
  return m ? m[0] : src;
}

function toCsv(doc: unknown): string {
  const d = doc as { exercises: Record<string, unknown>[] };
  if (!d.exercises?.length) return '';
  const cols = Array.from(
    d.exercises.reduce<Set<string>>((s, e) => {
      Object.keys(e).forEach((k) => s.add(k));
      return s;
    }, new Set()),
  );
  const esc = (v: unknown) => {
    if (Array.isArray(v)) return JSON.stringify(v.join('|'));
    if (typeof v === 'object' && v !== null) return JSON.stringify(JSON.stringify(v));
    if (v == null) return '';
    return JSON.stringify(String(v));
  };
  const lines = [cols.join(',')];
  for (const e of d.exercises) {
    lines.push(cols.map((c) => esc(e[c])).join(','));
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const subset = pickSubset(args.ids);
  if (subset.length === 0 && args.newCount === 0) {
    console.error('Nothing to enrich. Use --ids or --new.');
    process.exit(2);
  }
  const provider = withFixtures(
    getProvider(args.provider),
    resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures'),
  );
  const userPrompt = buildUserPrompt({
    schemaTypes: readSchemaTypes(),
    librarySubset: subset,
    fields: args.fields,
    newCount: args.newCount,
  });
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];
  console.error(`[enrich] provider=${provider.name} model=${args.model} fixture=${fixtureMode()}`);
  const text = await provider.complete(messages, { model: args.model, temperature: 0.2 });
  const json = requireJsonObject(text);
  const doc = parseEnrichment(json);
  const out = args.format === 'csv' ? toCsv(doc) : JSON.stringify(doc, null, 2);
  if (args.dryRun) {
    process.stdout.write(out);
    return;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = args.out ?? resolve(`src/data/enrichments/llm-${ts}.${args.format}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out, 'utf8');
  console.error(`[enrich] wrote ${outPath} (${doc.exercises.length} entries)`);
  if (args.audit) {
    mkdirSync(dirname(args.audit), { recursive: true });
    writeFileSync(
      args.audit,
      JSON.stringify({ args, messages, response: text }, null, 2),
      'utf8',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
