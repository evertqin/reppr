# reppr

Client-side workout plan generator and follow-along player. React + Vite + TypeScript.

**The running app is fully offline and never calls an LLM.** LLMs are used only by optional dev-time CLIs that produce committed artifacts (data files or generator source) reviewed by a human.

**Live: https://evertqin.github.io/reppr/**

## Quick start

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/ (PWA + service worker)
npm test           # vitest
npm run lint
npm run check      # lint + test + build (the same gates CI runs)
```

## Deploying changes

CI deploys to GitHub Pages on every push to `main` via `.github/workflows/pages.yml`. Two ways to ship:

```sh
# 1. One-shot script: runs gates, commits everything pending, pushes, watches the run.
npm run deploy

# 2. With a custom commit message
npm run deploy -- "feat: tweak hiit defaults"

# 3. Skip local checks (CI will still enforce them)
npm run deploy -- --skip-check

# 4. Push and don't block on the workflow
npm run deploy -- --no-watch
```

Or just `git push` — the workflow runs the same checks and publishes.

Other deploy helpers:

```sh
npm run deploy:status   # latest workflow runs
npm run deploy:watch    # interactive run watcher (uses gh)
```

The deploy script requires the [`gh`](https://cli.github.com/) CLI for watching runs (already authed if you use `gh auth login`). Push works without it.

### Hosting notes

- The app uses a hash router (`#/...`), so deep links survive Pages refreshes.
- `vite.config.ts` reads `VITE_BASE` (defaults to `/reppr/`). For a custom domain or root deploy, set `VITE_BASE=/`.
- The PWA manifest is scoped to the same base. To install on Xbox, Android, or desktop: open the URL in Edge/Chrome → menu → **Install app**. Once installed, the service worker serves everything offline.

## What you can do

- Build a plan: pick duration, body parts, goal, equipment, style, difficulty → **Generate**.
- Preview & edit: swap, remove, or reorder items in any block; expand any item to read step-by-step instructions.
- Play it back: full-screen player with countdown, timer/rep counter, animated stick figure, audio beeps, and TTS cues. Two-column layout shows the animation on the left and how-to + cues on the right. Keyboard: Space pause, ←/→ skip, R rep, Esc abort.
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
