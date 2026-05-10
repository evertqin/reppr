# reppr

Client-side workout plan generator and follow-along player. React + Vite + TypeScript.

**The running app is fully offline and never calls an LLM.** LLMs are used only by optional dev-time CLIs that produce committed artifacts (data files or generator source) reviewed by a human.

## Quick start

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/ (PWA + service worker)
npm test           # vitest
npm run lint
```

## What you can do

- Build a plan: pick duration, body parts, goal, equipment, style, difficulty → **Generate**.
- Preview & edit: swap, remove, or reorder items in any block.
- Play it back: full-screen player with countdown, timer/rep counter, animated stick figure, audio beeps, and TTS cues. Keyboard: Space pause, ←/→ skip, R rep, Esc abort.
- Save & history: plans persist in `localStorage`; export/import JSON.
- Extend the library: import portable enrichment files (JSON/CSV/XLSX) via Settings.

## Architecture

```
src/
  app/            routing, layout, error boundary
  domain/         shared TS types
  data/           seed library + enrichment merge
  features/
    config/       configuration form + draft store
    generator/    pure rule-based plan engine (engine.ts)
    preview/      editable plan preview
    player/       state machine + UI + ticker + wake lock
    history/      saved plans + completed sessions store
    settings/     audio, theme, enrichment importer
  animation/      renderer interface + SVG stick-figure registry
  audio/          beeps (Web Audio) + TTS (speechSynthesis)
  storage/        local storage adapter, export/import, user enrichments
tools/
  llm/
    enrich-exercises/   CLI: produce a portable enrichment file
    gen-engine/         CLI: regenerate engine.ts from a spec
    shared/             provider clients + fixture cache
```

Nothing in `src/` imports from `tools/`. The browser never makes network calls (verified by the offline test in `tests/offline.test.ts`).

## Dev-time LLM CLIs

Both CLIs use a fixture cache so CI runs without API keys:

```sh
LLM_FIXTURE=replay npm run llm:enrich-exercises:dry
LLM_FIXTURE=replay npm run llm:gen-engine:dry
```

With a real provider:

```sh
OPENAI_API_KEY=... npm run llm:enrich-exercises -- --new 2 --out src/data/enrichments/new.json
OPENAI_API_KEY=... npm run llm:gen-engine:promote
```

The `gen-engine` promote path runs `tsc`, the generator test suite, and ESLint as gates and rolls back on any failure. A "no banned APIs" scan blocks `fetch`, `process`, `Math.random`, `Date.now`, etc.

## Enrichment format

`EnrichmentDoc` (see `src/data/enrichmentSchema.ts`):

```jsonc
{
  "schemaVersion": 1,
  "source": "free-text",
  "exercises": [
    { "id": "pushup", "tags": ["upper"], "alternateExerciseIds": ["pike-pushup"] },
    { "id": "wall-sit", "name": "Wall Sit", "primaryMuscles": ["quads"], "equipment": ["none"],
      "difficulty": "beginner", "animationKey": "plank", "tempoSecPerRep": 1,
      "defaultScheme": { "kind": "time", "workSec": 30, "sets": 3, "restSec": 30 } }
  ]
}
```

Merge rules: seed always wins on populated fields; enrichments may fill empty fields and add new exercises. Bundled files in `src/data/enrichments/*.json` ship with the build; user-imported files persist in `localStorage` only.

## Testing

```sh
npm test          # 246 tests across generator, library, animation, player, audio, storage, offline, enrichment import
```

The `tests/offline.test.ts` suite stubs `fetch` and `XMLHttpRequest` and asserts the core pipeline still works — proving runtime independence from any network.

## License

Private project, all rights reserved (no public license attached).
