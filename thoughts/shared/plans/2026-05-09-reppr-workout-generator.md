# reppr — Workout Plan Generator Implementation Plan

## Overview

`reppr` is a client-side React + Vite + TypeScript single-page app that generates configurable workout plans (length, focus, difficulty, equipment, style) from a curated exercise library, then plays them back as a follow-along session with a large timer, an animated SVG figure, and beep + Web Speech voice cues. Plans persist in `localStorage`.

**The running app is fully self-sustaining and offline. It NEVER calls an LLM.**

LLM is used purely as a developer tool, outside the running app, in two ways:

1. **Dev-time codegen (`tools/llm/gen-engine`)** — a CLI that, given a high-level spec file, asks an LLM to produce/regenerate the source of the rule-based generator (`src/features/generator/engine.ts`). Output is committed to the repo and reviewed like any other code.
2. **Dev-time data authoring (`tools/llm/enrich-exercises`)** — a CLI that asks an LLM to produce a portable enrichment file (JSON, optionally CSV/XLSX) describing additional or improved exercise fields (cues, instructions, secondary muscles, alternates, tags). The file is dropped into `src/data/enrichments/` (or imported via the in-app **Import enrichment** button into the user's local store), and the app merges it into its in-memory exercise database at startup. Producing the file requires an LLM and is a developer/power-user activity; consuming it does not.

## Current State Analysis

The workspace is empty (`f:\projects\WorkoutPlanGenerator\`). No prior code, configs, or notes. Greenfield build — every file is created in this plan.

## Desired End State

A user can:

1. Open the app, fill a configuration form (duration, body parts, goal, equipment, style, difficulty).
2. Click **Generate** → see an editable preview of a structured plan (warm-up → main blocks → cool-down).
3. Click **Start** → enter a full-screen follow-along player showing: current exercise name, animated SVG figure, rep target or work timer, next-up preview, progress bar, pause/skip/back controls, audible 3-2-1 beeps and spoken cues.
4. Save plans and view history; export/import plans as JSON.
5. **Import an enrichment file** (JSON, CSV, or XLSX) via Settings to extend the local exercise database. Imported entries are persisted to `localStorage` and merged at startup; the app is fully usable without ever importing one.

A developer (or power user) can:

6. Run `npm run llm:gen-engine` to regenerate the rule-based generator source from `tools/llm/gen-engine/spec.md` using a configured LLM provider; the resulting file passes the existing generator test suite unchanged.
7. Run `npm run llm:enrich-exercises` to produce a portable enrichment file. Either commit it to `src/data/enrichments/` (ships with the build) or hand it to a user who imports it via Settings.

**Verification:** `npm run build` succeeds, `npm run test` passes, manual E2E (generate → play through a 10-min plan → save → reload → replay) works in latest Chrome and on a mobile viewport with the network disabled. Both LLM CLIs run end-to-end in dry-run mode (using a recorded fixture response) as part of CI.

**Verification:** `npm run build` succeeds, `npm run test` passes, manual E2E (generate → play through a 10-min plan → save → reload → replay) works in latest Chrome and on a mobile viewport. Both LLM CLIs run end-to-end in dry-run mode (using a recorded fixture response) as part of CI.

### Key Discoveries
- Greenfield project — no existing conventions to honor; we set them.
- User confirmed: SVG renderer first, but **must be swappable** for Lottie / video / Three.js later → animation must sit behind a renderer interface.
- **Hard rule: the running app makes zero LLM calls.** No API keys in the browser, no network requests to any model provider. LLMs are exclusively a dev-time/CLI concern.
- LLM has two dev-time uses with strict separation: **codegen** (writes generator source) and **data authoring** (writes a portable enrichment file). Both produce artifacts committed to the repo or imported by users; neither runs in the browser.
- The rule-based generator remains the source of truth at runtime — even when its source was authored by an LLM, the committed code is what runs and what tests cover.
- Enrichment files are a stable, documented format. Anyone (LLM or human) can produce one with a spreadsheet or text editor.
- Web Speech API (`speechSynthesis`) is built into browsers — no dep needed; gate behind a feature toggle since Safari iOS quirks exist.

### Lessons Learned (post-launch)
- **Lottie renderer was tried and removed.** We added a hybrid path (Lottie preferred → SVG stick figure fallback) plus the `lottie-react` dependency. In practice the bottleneck is **sourcing**: high-quality, license-clean, exercise-specific Lotties are scarce — most "free" assets on LottieFiles are personal-use only, are barbell-centric (don't match bodyweight exercises in our seed), or are malformed (LLM-generated JSONs without the required `tr` transform on shape groups, which silently render zero paths). The runtime cost is also non-trivial: ~317 KB code-split chunk per session that loads a Lottie. **Recommendation: stay on the multi-keyframe SVG stick figures.** They render every exercise consistently, are deterministic, weigh nothing, and look fine after the keyframe-with-easing upgrade. Revisit Lottie only if a vetted, license-clean fitness pack becomes available — and even then, gate it on a per-exercise opt-in to avoid loading the runtime for plans that have no Lotties.
- The animation renderer interface (`AnimationRenderer` + registry resolution order) was the right abstraction; removing Lottie was a one-file change.

## What We're NOT Doing

- No backend, no user accounts, no cloud sync.
- No video/3D/Lottie renderers in v1 (only the abstraction to add them later).
- No exercise-form computer-vision / pose detection.
- No payments, ads, or analytics.
- No native mobile app (PWA install only, in a later phase).
- No i18n in v1 (English only; copy centralized to ease future i18n).
- No social sharing beyond JSON export.
- **No runtime LLM use of any kind.** No API keys in the browser, no in-app "enrich with AI" buttons, no network calls to model providers.
- **No runtime code generation** — the LLM-authored generator source is produced offline by a developer, reviewed, and committed.
- **No automatic merging of LLM dev-tool output into source** — every codegen run produces a diff that a human reviews before commit. Enrichment files imported via the UI are merged into the user's local store only, never into the shipped data.

## Implementation Approach

Build incrementally, each phase independently runnable and testable. Pure data + pure functions for the generator (easy to unit-test). UI layered on top. Animation, audio, and LLM are isolated modules behind interfaces so they can evolve without touching core logic.

Folder layout:

```
reppr/
  src/
    app/                  # routes, providers, layout
    features/
      config/             # configuration form
      generator/          # rule-based plan engine (pure) -- may be LLM-authored offline
      preview/            # plan preview + edit
      player/             # follow-along runtime (state machine, UI)
      history/            # saved plans list
      settings/           # audio prefs, enrichment import
    data/
      exercises.seed.ts            # hand-authored exercise seed (always wins on conflict)
      enrichments/                 # bundled enrichment files shipped with the build
        README.md                  # explains the format
        *.json                     # zero or more bundled enrichment files
      enrichmentSchema.ts          # zod-like schema + parser for JSON/CSV/XLSX
      exercises.ts                 # exports merged EXERCISES (seed + bundled + user-imported)
    domain/               # shared TS types (used by app and tools/)
    animation/
      types.ts            # Renderer interface
      svg/                # SvgRenderer + per-exercise SVG components
    audio/                # beeps + TTS service
    storage/              # localStorage adapter (incl. user enrichments)
    lib/                  # tiny utilities
  tools/
    llm/
      shared/             # provider clients (Node fetch), prompt utils, fixture recorder
      gen-engine/         # CLI: regenerate src/features/generator/engine.ts
        spec.md           # human-authored spec the LLM is asked to implement
        prompt.ts         # prompt assembly
        index.ts          # CLI entry
        fixtures/         # recorded LLM responses for CI/offline runs
      enrich-exercises/   # CLI: produce a portable enrichment file
        prompt.ts
        index.ts          # writes to src/data/enrichments/<name>.json by default
        fixtures/
  tests/
  public/
  index.html
  vite.config.ts
  tsconfig.json
  package.json
```

Note: there is no `src/llm/` folder. Nothing in `src/` knows what an LLM is.

---

## Phase 1: Project Scaffolding

### Overview
Create the Vite + React + TS project, configure linting, formatting, testing, and routing skeleton.

### Changes Required

#### 1. Initialize project
**Files**: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `README.md`

**Actions**:
- `npm create vite@latest reppr -- --template react-ts` (run inside `f:\projects\WorkoutPlanGenerator`).
- Add deps: `react-router-dom`, `zustand` (lightweight global state), `clsx`.
- Add dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@types/node`, `eslint`, `prettier`, `eslint-config-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.
- Configure `vitest` in `vite.config.ts` with `environment: 'jsdom'` and `setupFiles: ['./tests/setup.ts']`.

#### 2. Routing skeleton
**File**: `src/app/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigPage } from '../features/config/ConfigPage';
import { PreviewPage } from '../features/preview/PreviewPage';
import { PlayerPage } from '../features/player/PlayerPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { Layout } from './Layout';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ConfigPage />} />
          <Route path="preview/:planId" element={<PreviewPage />} />
          <Route path="play/:planId" element={<PlayerPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

#### 3. Page stubs
Each page exports a component that renders its name. Wired so navigation works end-to-end.

### Success Criteria

#### Automated Verification
- [x] `npm install` succeeds with no peer-dep errors.
- [x] `npm run build` produces `dist/` with no TS errors.
- [x] `npm run lint` passes.
- [x] `npm run test` runs (one trivial smoke test passes).

#### Manual Verification
- [ ] `npm run dev` opens `http://localhost:5173`, all five routes render their stubs.
- [ ] Browser console shows no errors or warnings.

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Domain Model + Exercise Library

### Overview
Define TypeScript types and seed a library of ~30 exercises with metadata that drives both generation and playback.

### Changes Required

#### 1. Domain types
**File**: `src/domain/types.ts`

```ts
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'fullBody';

export type Equipment = 'none' | 'dumbbells' | 'bands' | 'pullupBar' | 'bench' | 'barbell';
export type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'fatLoss' | 'mobility';
export type Style = 'straightSets' | 'circuit' | 'hiit' | 'tabata';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type BlockKind = 'warmup' | 'main' | 'cooldown';
export type Scheme =
  | { kind: 'reps'; reps: number; sets: number; restSec: number }
  | { kind: 'time'; workSec: number; sets: number; restSec: number };

export interface Exercise {
  id: string;                    // stable kebab-case
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];        // [] means bodyweight (== 'none')
  difficulty: Difficulty;
  isWarmup?: boolean;
  isCooldown?: boolean;
  unilateral?: boolean;
  animationKey: string;          // maps to a registered renderer asset
  cues: string[];                // short imperative form cues
  instructions: string[];        // step-by-step setup
  tempoSecPerRep: number;        // used to convert reps<->time
  defaultScheme: Scheme;
}

export interface PlanItem {
  id: string;                    // unique per-item (uuid)
  exerciseId: string;
  scheme: Scheme;
  notes?: string;                // optional coaching tip from an enrichment file
}

export interface PlanBlock {
  id: string;
  kind: BlockKind;
  label: string;                 // e.g. "Warm-up", "Block 1: Push", "Cool-down"
  rounds: number;                // 1 for straight sets/warmup; >1 for circuit/HIIT
  items: PlanItem[];
  interItemRestSec: number;
  interRoundRestSec: number;
}

export interface WorkoutPlan {
  id: string;
  createdAt: string;             // ISO
  name: string;
  config: ConfigInput;
  blocks: PlanBlock[];
  estimatedDurationSec: number;
}

export interface ConfigInput {
  durationMin: number;           // 5..90
  bodyParts: MuscleGroup[];      // [] => fullBody
  goal: Goal;
  equipment: Equipment[];        // must include 'none' implicitly
  style: Style;
  difficulty: Difficulty;
}
```

#### 2. Seed exercise library
**File**: `src/data/exercises.seed.ts`

Hand-authored. At least 30 exercises spanning all muscle groups and equipment tiers. Each entry uses an `animationKey` from this initial set (Phase 5 implements the SVGs):

`squat`, `lunge`, `pushup`, `plank`, `situp`, `crunch`, `glute-bridge`, `jumping-jack`, `mountain-climber`, `burpee`, `dumbbell-curl`, `dumbbell-row`, `dumbbell-press`, `dumbbell-rdl`, `band-pull-apart`, `pullup`, `dip`, `superman`, `bird-dog`, `cat-cow`, `arm-circles`, `hip-circles`, `world-greatest-stretch`, `child-pose`, `pike-pushup`, `lateral-raise`, `tricep-kickback`, `goblet-squat`, `reverse-lunge`, `hollow-hold`.

Warm-up flags on `arm-circles`, `hip-circles`, `cat-cow`, `world-greatest-stretch`, `jumping-jack`. Cool-down flags on `child-pose`, `cat-cow`, stretches.

#### 3. Merged library + accessors
**File**: `src/data/exercises.ts`

The app NEVER reads `exercises.seed.ts` directly. It imports from `exercises.ts`, which merges three layers (in order; later layers can add fields but never overwrite hand-authored values on the seed):

1. `exercises.seed.ts` (hand-authored, always wins on conflict).
2. Bundled enrichment files in `src/data/enrichments/*.json` (imported via `import.meta.glob('./enrichments/*.json', { eager: true })`).
3. User-imported enrichments loaded from `localStorage` (Phase 9).

```ts
import { SEED_EXERCISES } from './exercises.seed';
import { mergeEnrichments } from './enrichmentSchema';
const bundled = import.meta.glob('./enrichments/*.json', { eager: true, import: 'default' });
export function buildLibrary(userEnrichments: EnrichmentDoc[] = []): Exercise[] {
  return mergeEnrichments(SEED_EXERCISES, [...Object.values(bundled), ...userEnrichments]);
}
export const EXERCISES: readonly Exercise[] = buildLibrary();
export const EXERCISE_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
export function findExercises(filter: {
  muscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  warmup?: boolean;
  cooldown?: boolean;
}): Exercise[];
```

The `EXERCISES` const is rebuilt when user enrichments change (the store re-invokes `buildLibrary`). Merge rules:
- New exercise `id` not in seed → added in full (must validate against schema).
- Existing `id`, missing optional fields on seed (e.g. empty `cues[]`, missing `instructions[]`, missing `secondaryMuscles[]`) → enrichment fills them.
- Existing `id`, fields already populated on seed → enrichment is **ignored** for those fields (seed wins).
- Conflicts logged to the console in dev mode and surfaced in Settings.

#### 4. Enrichment schema
**File**: `src/data/enrichmentSchema.ts`

Defines `EnrichmentDoc`:

```ts
export interface EnrichmentDoc {
  schemaVersion: 1;
  source?: string;        // free-text; e.g. "llm:openai:gpt-4o 2026-05-09"
  exercises: EnrichmentEntry[];
}
export interface EnrichmentEntry {
  id: string;             // matches Exercise.id; new id => new exercise
  name?: string;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  isWarmup?: boolean;
  isCooldown?: boolean;
  unilateral?: boolean;
  animationKey?: string;
  cues?: string[];
  instructions?: string[];
  tempoSecPerRep?: number;
  defaultScheme?: Scheme;
  alternateExerciseIds?: string[];
  tags?: string[];
}
```

Exports `parseEnrichment(input: unknown): EnrichmentDoc` (throws on invalid) and `mergeEnrichments(seed, docs): Exercise[]`.

### Success Criteria

#### Automated Verification
- [x] `npm run build` passes (types compile).
- [x] `npm run test` passes a data-integrity test that asserts: every seed exercise has ≥1 primary muscle, every `animationKey` is unique-or-shared-intentionally, no duplicate `id` in seed, and `findExercises` returns expected counts for sample filters.
- [x] Merge test: a fixture enrichment that adds a new exercise and fills empty cues on an existing one produces the expected merged library; a fixture enrichment that tries to overwrite a seed-provided field is silently ignored for that field.
- [x] Schema test: `parseEnrichment` rejects malformed input (wrong types, unknown muscle, missing `id`) with informative errors.

#### Manual Verification
- [ ] Open `src/data/exercises.seed.ts` and spot-check entries for plausible cues/instructions.
- [ ] Drop a sample enrichment JSON into `src/data/enrichments/`, restart dev server, verify the new fields appear in the preview UI.

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Rule-Based Plan Generator

### Overview
A pure function `generatePlan(config, library, rng) -> WorkoutPlan` that produces a balanced plan honoring all configuration dimensions. Fully unit-tested.

### Changes Required

#### 1. Generator engine
**File**: `src/features/generator/engine.ts`

Algorithm:
1. **Filter library** by `config.equipment` and `config.difficulty` (allow one tier below if pool too small).
2. **Pick warm-up** (3 exercises, 30s each) from `isWarmup` pool matching target muscles or `fullBody`.
3. **Pick cool-down** (2–3 stretches, 30–45s each) from `isCooldown` pool.
4. **Compute main-block budget** = `durationMin*60 - warmupSec - cooldownSec - bufferSec`.
5. **Choose scheme template** by `style`:
   - `straightSets`: 4–6 exercises × 3–4 sets, rep-based, 60–90s rest.
   - `circuit`: 5–6 exercises × 3 rounds, rep-based, 30s inter-item, 60s inter-round.
   - `hiit`: 6–8 exercises × 3–4 rounds, 40s work / 20s rest.
   - `tabata`: 8 exercises × 8 rounds, 20s work / 10s rest.
6. **Apply goal modifiers**:
   - `strength`: lower reps (4–6), longer rest, higher difficulty bias.
   - `hypertrophy`: 8–12 reps, moderate rest.
   - `endurance`: 15–20 reps or longer work intervals.
   - `fatLoss`: bias toward `hiit`/`circuit` if style allows; shorter rest.
   - `mobility`: bias warmup/cooldown pool, longer holds.
7. **Apply difficulty modifiers**: scale sets/reps/rest ±20%.
8. **Select main exercises** to cover requested `bodyParts` evenly (round-robin by primary muscle), avoiding back-to-back same-muscle items in circuits.
9. **Estimate duration** by summing `(work + rest) * sets * rounds + transitions`. Adjust by trimming or duplicating until within ±10% of target.
10. Return `WorkoutPlan` with deterministic `id` (uuid v4 from injected `rng`).

**File**: `src/features/generator/index.ts` re-exports `generatePlan`, helpers, and `estimateDurationSec`.

#### 2. Tests
**File**: `tests/generator.test.ts`

Cases:
- Generates a plan within ±10% of target duration for: 10/20/30/45/60 min × all styles × all goals × {beginner, advanced}.
- Bodyweight-only config produces zero exercises requiring equipment.
- `bodyParts: ['chest']` produces ≥60% of main exercises with `chest` as primary or secondary.
- Tabata always produces 8 exercises × 8 rounds × 20/10s.
- Deterministic when given a seeded RNG.

### Success Criteria

#### Automated Verification
- [x] `npm run test` passes all generator tests.
- [x] `npm run lint` passes.
- [x] No `any` types in `features/generator/`.

#### Manual Verification
- [ ] Run `node --import tsx scripts/dump-sample-plans.ts` (small dev script) and eyeball 5 sample plans for sensible structure.

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Configuration UI + Preview

### Overview
Build the form for `ConfigInput` and the editable preview screen. Wires generator to UI.

### Changes Required

#### 1. Config store
**File**: `src/features/config/store.ts`

`zustand` store holding the current draft `ConfigInput` and the most recently generated plan. Persisted draft to `localStorage` so refresh keeps inputs.

#### 2. Configuration form
**File**: `src/features/config/ConfigPage.tsx`

Controls:
- Duration: slider 5–90 min (step 5).
- Body parts: chip multi-select (chest, back, shoulders, arms, legs, core, full body).
- Goal: radio (strength / hypertrophy / endurance / fat loss / mobility).
- Equipment: chip multi-select (`none` always implicit + dumbbells / bands / pullup bar / bench / barbell).
- Style: radio (straight sets / circuit / HIIT / tabata).
- Difficulty: segmented (beginner / intermediate / advanced).
- **Generate** button → calls `generatePlan`, persists to history store, navigates to `/preview/:planId`.

#### 3. Preview page
**File**: `src/features/preview/PreviewPage.tsx`

- Renders plan summary (estimated duration, block count).
- Lists each block with its items: exercise name, scheme (e.g. "3 × 10" or "40s work / 20s rest"), small SVG thumbnail (Phase 5 fills these in; placeholder square until then).
- Per-item actions: **Swap** (picks another exercise from same muscle/equipment pool), **Remove**, drag-to-reorder within a block.
- **Start workout** button → navigates to `/play/:planId`.
- **Save** button → persists plan to history.

### Success Criteria

#### Automated Verification
- [x] `npm run build` passes.
- [x] Component tests for `ConfigPage` (form submit produces valid config) and `PreviewPage` (swap/remove/reorder mutate the plan).
- [x] `npm run lint` passes.

#### Manual Verification
- [ ] Generate a plan from each style; preview shows a sensible layout on desktop (≥1024px) and mobile (375px).
- [ ] Swap/remove/reorder behave intuitively; estimated duration updates after edits.

**Implementation Note**: Pause for manual confirmation before Phase 5.

---

## Phase 5: Animation Abstraction + SVG Renderer

### Overview
Define a renderer interface so SVG is just one of many future implementations. Ship initial SVG figure animations.

### Changes Required

#### 1. Renderer interface
**File**: `src/animation/types.ts`

```ts
export interface AnimationRendererProps {
  animationKey: string;
  /** 0..1 of one rep; player drives this for rep-based exercises. */
  repProgress?: number;
  /** Loop driver; renderer ignores repProgress and self-loops. */
  loop?: boolean;
  /** Visual scale; default 1. */
  scale?: number;
  ariaLabel: string;
}

export type AnimationRenderer = React.ComponentType<AnimationRendererProps>;

export interface AnimationRegistry {
  has(key: string): boolean;
  /** Returns the renderer for a key, or a fallback placeholder. */
  get(key: string): AnimationRenderer;
}
```

#### 2. Registry + dispatcher
**File**: `src/animation/registry.ts`

A module that holds a `Map<string, AnimationRenderer>`. SVG modules self-register at import time. Exposes `<ExerciseAnimation animationKey={...} ariaLabel={...} />` which looks up the key and renders, with a generic "stick figure idle" fallback.

#### 3. SVG renderer set
**File**: `src/animation/svg/*.tsx`

One component per `animationKey`. Each is a hand-built SVG `<svg viewBox="0 0 200 300">` with a stick-figure (head circle, torso line, jointed limbs as `<line>`/`<path>`) animated via either:
- **CSS `@keyframes`** when `loop` mode (default).
- **Computed transforms from `repProgress`** when the player drives reps (transform = lerp between two key poses).

Required v1 set (others use idle fallback): `squat`, `pushup`, `plank`, `jumping-jack`, `lunge`, `glute-bridge`, `mountain-climber`, `crunch`, `dumbbell-curl`, `dumbbell-press`. The remaining `animationKey`s map to the closest available SVG (e.g., `goblet-squat` → `squat`) via an alias map until purpose-built SVGs are added.

#### 4. Reduced-motion fallback
**File**: `src/animation/svg/IdleFigure.tsx`

When `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, all SVG renderers freeze on the start pose and rely on the rep counter / timer to convey progress.

### Success Criteria

#### Automated Verification
- [x] Snapshot tests for each SVG renderer at `repProgress = 0, 0.5, 1`.
- [x] Registry test: unknown key returns fallback without throwing.
- [x] `npm run build` passes.

#### Manual Verification
- [ ] Open preview thumbnails: each animation plays smoothly in Chrome and Firefox.
- [ ] Toggle OS "reduce motion" → animations freeze on start pose.

**Implementation Note**: Pause for manual confirmation before Phase 6.

---

## Phase 6: Follow-Along Player

### Overview
Full-screen runtime that walks the user through the plan with timers, rep counts, animations, and controls.

### Changes Required

#### 1. Player state machine
**File**: `src/features/player/machine.ts`

A reducer-based finite state machine (no extra dep). States:

```
idle → countdown(3..1) → working(item) → resting(itemRest)
       → next item or next round → blockTransition → next block
       → cooldownDone → finished
```

Events: `start`, `tick(deltaMs)`, `pause`, `resume`, `skipForward`, `skipBack`, `repComplete` (manual tap for rep-based items), `abort`.

The reducer is pure (`(state, event) => newState`); a `useTicker` hook drives `tick` events at ~10 Hz via `requestAnimationFrame`.

#### 2. Player UI
**File**: `src/features/player/PlayerPage.tsx`

Layout (CSS grid, mobile-first):
- Top bar: block label, overall progress bar, exit button.
- Center: `<ExerciseAnimation>` (large), exercise name, scheme line.
- Below center: huge timer (mm:ss) for time-based, or rep counter "5 / 12" with a tap-to-count button for rep-based.
- Bottom: pause / skip-back / skip-forward, plus a "next: <exercise>" preview chip.
- Rest screens reuse the layout but show "REST" headline, a dimmed silhouette of the next exercise's animation, and a count-down ring.

#### 3. Keyboard shortcuts
- Space: pause/resume.
- ←/→: skip back/forward.
- R: mark a rep complete (rep-based items).
- Esc: abort (with confirm).

#### 4. Wake Lock
Use the Screen Wake Lock API while the player is active to prevent the screen from sleeping. Gracefully no-op on unsupported browsers.

### Success Criteria

#### Automated Verification
- [x] Reducer unit tests cover all state transitions and edge cases (skip past end, skip before start, pause during countdown, abort from any state).
- [x] `npm run build` passes.

#### Manual Verification
- [ ] Run a full 10-min HIIT plan to completion without any visual or timing glitches.
- [ ] Pause/resume/skip controls behave correctly mid-rest and mid-work.
- [ ] On mobile, screen stays awake for the duration of the workout.
- [ ] Layout is comfortable on a 375px-wide phone and on a 1440px desktop.

**Implementation Note**: Pause for manual confirmation before Phase 7.

---

## Phase 7: Audio Cues (Beeps + TTS)

### Overview
Add audible countdown beeps and spoken cues, with a user toggle and minimal Safari-iOS-friendly initialization.

### Changes Required

#### 1. Beep service
**File**: `src/audio/beeps.ts`

Web Audio API. `playBeep({ freq, durationMs, volume })`. Pre-warm an `AudioContext` on the first user gesture in the player ("Start"). High beep at "go", short beeps for the last 3 seconds of work and rest.

#### 2. Speech service
**File**: `src/audio/speech.ts`

Wraps `window.speechSynthesis`. Provides `speak(text, opts)`, queue management, cancel-on-skip. Settings: voice, rate, volume, on/off.

#### 3. Player integration
**File**: `src/features/player/PlayerPage.tsx`

On state transitions:
- Entering `countdown(n)` → beep on each tick (low for 3, low for 2, high for 1=go).
- Entering `working(item)` → speak `"Next: <name>, <scheme>"` (only if not already spoken in pre-rest preview).
- Last 3 seconds of any timer → low beeps.
- Entering `resting(...)` → speak `"Rest <n> seconds. Next: <name>"`.
- Entering `finished` → speak `"Workout complete. Great job."`.

#### 4. Settings
**File**: `src/features/settings/SettingsPage.tsx`

Toggles for beeps, TTS, voice select, rate slider; persisted in `localStorage` via a settings store.

### Success Criteria

#### Automated Verification
- [x] Unit tests for `speech.ts` queue logic with a mocked `speechSynthesis`.
- [x] `npm run lint` and `npm run build` pass.

#### Manual Verification
- [ ] In Chrome desktop and Chrome Android: beeps fire on the last 3 seconds; voice announces next exercise.
- [ ] Disabling each toggle in Settings instantly affects the next cue.
- [ ] Skipping forward cancels any in-flight speech (no overlap).

**Implementation Note**: Pause for manual confirmation before Phase 8.

---

## Phase 8: Persistence + History + Export/Import

### Overview
Save plans, log completed sessions, and allow JSON export/import.

### Changes Required

#### 1. Storage adapter
**File**: `src/storage/local.ts`

Typed wrapper around `localStorage` with versioned keys (`reppr:plans:v1`, `reppr:history:v1`, `reppr:settings:v1`). Includes a tiny migration hook for future versions.

#### 2. History store
**File**: `src/features/history/store.ts`

`zustand` store with: list of saved plans, list of completed sessions (`planId`, `completedAt`, `durationActualSec`, `skippedItemIds`).

#### 3. History page
**File**: `src/features/history/HistoryPage.tsx`

Two tabs: **Saved Plans** (replay / delete / export) and **Completed Sessions** (timestamp, plan name, duration). Top-right buttons: **Export all** (downloads `reppr-export.json`) and **Import** (file picker, validates with a zod-like hand-rolled validator to avoid the dep — schema lives next to types).

#### 4. Player completion hook
On reaching `finished`, append a session record to history.

### Success Criteria

#### Automated Verification
- [ ] Unit tests for storage adapter (round-trip, version mismatch handling).
- [ ] Unit test for import validator rejecting malformed JSON.

#### Manual Verification
- [ ] Generate plan → save → reload page → plan still listed.
- [ ] Export → clear `localStorage` → import → all data restored.
- [ ] Completed sessions appear after finishing a workout.

**Implementation Note**: Pause for manual confirmation before Phase 9.

---

## Phase 9: LLM Dev Tool — Portable Enrichment File Producer + In-App Importer

### Overview
Two pieces, both in service of the same goal: extend the exercise database without ever calling an LLM from the running app.

1. A Node CLI under `tools/llm/enrich-exercises/` that asks an LLM to produce an `EnrichmentDoc` (Phase 2 schema) and writes it to a portable file (JSON by default; CSV/XLSX optional). The file is a normal artifact: the developer can commit it to `src/data/enrichments/` (so it ships with the build) or hand it to a user.
2. An in-app **Import enrichment** flow on the Settings page that lets a user load such a file from their disk; the parsed doc is validated, persisted to `localStorage`, and merged into the live library at startup.

The app has no LLM dependency. The CLI does.

### Changes Required

#### 1. Shared LLM tooling (Node only)
**Files**: `tools/llm/shared/provider.ts`, `tools/llm/shared/prompt.ts`, `tools/llm/shared/fixture.ts`, `tools/llm/shared/io.ts`

- `provider.ts` exports `LlmProvider` interface with `complete(messages, opts)`. Implementations: `OpenAIProvider`, `AnthropicProvider`. Each reads its API key from environment (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) — never from a file in the repo, never from the browser.
- `prompt.ts` helpers: `buildSystemPrompt(role)`, `requireJsonObject(text)`.
- `fixture.ts`: when `LLM_FIXTURE=record`, writes the live response to `fixtures/<hash>.json`; when `LLM_FIXTURE=replay` (default in CI), loads the fixture instead of calling the provider. Hash is derived from prompt + model + temperature so changes invalidate fixtures explicitly.
- `io.ts`: helpers for reading the seed library (via `tsx` import) and writing the output in JSON / CSV / XLSX.

#### 2. Enrichment CLI
**Files**: `tools/llm/enrich-exercises/index.ts`, `tools/llm/enrich-exercises/prompt.ts`

CLI flags:
- `--provider openai|anthropic` (default: from env `LLM_PROVIDER`).
- `--model <id>`.
- `--ids <csv>` to scope to specific exercises; default = all seed entries with missing optional fields.
- `--new <count>` to ask the LLM to propose N entirely new exercises filling gaps in muscle/equipment coverage.
- `--fields cues,instructions,secondaryMuscles,alternates,tags` (default = missing-only).
- `--format json|csv|xlsx` (default `json`).
- `--out <path>` (default `src/data/enrichments/llm-<timestamp>.json`).
- `--dry-run` prints the would-be file to stdout without writing.
- `--audit tools/llm/enrich-exercises/runs/<timestamp>.json` for the full prompt + response log.

Prompt contents per call:
1. The relevant subset of the current library as JSON.
2. The `EnrichmentDoc` schema (TypeScript types pasted inline).
3. Strict instructions: "Return JSON only conforming to `EnrichmentDoc`. Do not invent equipment requirements. Cues must be ≤8 words, imperative. Do not output fields you are not adding or improving."

Responses are JSON-validated by the same `parseEnrichment` used at runtime (Phase 2). Schema violations cause non-zero exit with the offending entries reported. CSV/XLSX outputs are flat tables: one row per exercise, with array fields encoded as `|`-separated strings; the in-app importer handles both shapes.

#### 3. In-app importer
**Files**: `src/features/settings/EnrichmentImport.tsx`, `src/storage/enrichments.ts`

Settings page section "Exercise Database":
- Lists currently active enrichment sources (bundled files + each user-imported doc with name, source, count of exercises affected).
- **Import file** button → file picker (`.json`, `.csv`, `.xlsx`) → parses (the JSON path is direct; CSV/XLSX go through a small adapter that converts back to `EnrichmentDoc`) → validates with `parseEnrichment` → on success, persists to `localStorage` (`reppr:enrichments:v1`) and triggers a library rebuild.
- Per-source **Disable** / **Remove** actions.
- **Import errors** are shown inline with the offending row/field; nothing is persisted on validation failure.

XLSX support uses `xlsx` (`sheetjs`) lazy-loaded via `React.lazy`/dynamic `import()` so the parser is not in the initial bundle and not loaded at all unless the user opens the importer.

#### 4. NPM scripts
**File**: `package.json`

```json
{
  "scripts": {
    "llm:enrich-exercises": "tsx tools/llm/enrich-exercises/index.ts",
    "llm:enrich-exercises:dry": "tsx tools/llm/enrich-exercises/index.ts --dry-run"
  }
}
```

#### 5. Safety rails
- CLI never edits `src/data/exercises.seed.ts`. It only writes new files under `src/data/enrichments/` (or wherever `--out` points).
- CLI validates its output against `parseEnrichment` and the data-integrity test fixture before writing.
- Browser importer enforces a max upload size (1 MB) and a max entries-per-doc (1000) to prevent UI lock-up.
- All importer parsing happens client-side; the file never leaves the device.

### Success Criteria

#### Automated Verification
- [x] `npm run llm:enrich-exercises:dry` (with `LLM_FIXTURE=replay`) runs in CI and exits 0.
- [x] CLI replay output matches a committed expected snapshot byte-for-byte.
- [x] Existing data-integrity test (Phase 2) passes against the seed plus the bundled enrichments folder.
- [x] Schema-violating mock response causes the CLI to exit non-zero with a clear error.
- [x] Importer unit tests: valid JSON → merged; invalid JSON → no mutation, error surfaced; CSV round-trip equals JSON round-trip; XLSX dynamic import is not present in the main bundle (verified by checking `dist/assets/` chunk graph).
- [x] **No-network test**: a Vitest run with `fetch` and `XMLHttpRequest` stubbed to throw still passes the full `src/` test suite — proves the running app makes no network calls.

#### Manual Verification
- [ ] With a real API key, run the CLI to add 2 new bodyweight exercises; review the diff in git; cues are sensible.
- [ ] Take that same JSON file, import it via Settings on a fresh browser profile (no key configured anywhere), confirm the new exercises appear and can be used in generated plans.
- [ ] Run the dev server with the network throttled to offline; the app loads and works end-to-end.
- [ ] Disabling an imported source in Settings immediately removes its contributions from the library.

**Implementation Note**: Pause for manual confirmation before Phase 10.

---

## Phase 10: LLM Dev Tool — Generator Source Synthesis

### Overview
A Node CLI under `tools/llm/gen-engine/` that asks an LLM to (re)generate the source of `src/features/generator/engine.ts` from a human-authored spec. The committed output is what runs at runtime; the existing generator test suite (Phase 3) is the acceptance gate.

### Changes Required

#### 1. Spec document
**File**: `tools/llm/gen-engine/spec.md`

A precise, prose+pseudocode specification of the generator: input/output types (referenced from `src/domain/types.ts`), the 10-step algorithm from Phase 3, style/goal/difficulty modifier tables, duration-budget rules, and invariants (determinism with injected RNG, no I/O, no `any`). The spec is the source of truth — any algorithm change starts with editing this file, not the generated code.

#### 2. Codegen CLI
**Files**: `tools/llm/gen-engine/index.ts`, `tools/llm/gen-engine/prompt.ts`

The prompt assembles:
1. The full text of `spec.md`.
2. The full text of `src/domain/types.ts` (so the model sees exact types).
3. A representative subset of `tests/generator.test.ts` (so the model knows the contract it must satisfy).
4. Strict instructions: "Return a single TypeScript module body. No prose. No markdown fences. No imports beyond `../../domain/types` and a seeded RNG helper. No `any`. No I/O. Pure functions only."

CLI flags:
- `--provider`, `--model`, `--temperature` (default 0.2).
- `--out src/features/generator/engine.generated.ts` (writes to a `.generated.ts` file, NOT directly to `engine.ts`).
- `--promote` copies `engine.generated.ts` over `engine.ts` only if all gates below pass.
- `--dry-run` prints the candidate without writing.

#### 3. Acceptance gates (run automatically before `--promote`)

The CLI orchestrates:
1. Write candidate to `engine.generated.ts`.
2. `tsc --noEmit` on just that file (must compile, no `any`).
3. `vitest run tests/generator.test.ts` with the candidate aliased in (via a tsconfig path override scoped to this CLI run).
4. ESLint on the candidate.
5. A "no banned APIs" lint pass: regex-deny `fetch`, `require`, `process`, `globalThis`, `Date.now`, `Math.random` (RNG must be the injected one).

Only on all-green does `--promote` overwrite `engine.ts`. The previous `engine.ts` is moved to `engine.ts.bak` for one run, then replaced on the next promote.

#### 4. Audit trail
**File**: `tools/llm/gen-engine/runs/<timestamp>.json`

Each run logs: prompt hash, model, provider, full response, gate results, accepted/rejected. Committed alongside any promoted change so reviewers see exactly how the code came to be.

#### 5. NPM scripts
**File**: `package.json`

```json
{
  "scripts": {
    "llm:gen-engine": "tsx tools/llm/gen-engine/index.ts",
    "llm:gen-engine:promote": "tsx tools/llm/gen-engine/index.ts --promote",
    "llm:gen-engine:dry": "tsx tools/llm/gen-engine/index.ts --dry-run"
  }
}
```

#### 6. Safety rails
- The CLI never overwrites `engine.ts` without `--promote` AND all gates passing.
- A header comment is prepended to the generated file: `// AUTO-GENERATED by tools/llm/gen-engine. Edit spec.md and re-run.`
- ESLint rule (custom) warns if a developer hand-edits the auto-generated file (checks for the header on commit via `lint-staged`).
- The generator's test suite (Phase 3) is the acceptance contract — it must NOT be modified by this tool.

### Success Criteria

#### Automated Verification
- [x] `npm run llm:gen-engine:dry` with `LLM_FIXTURE=replay` runs in CI and exits 0.
- [x] All Phase 3 generator tests pass against the committed `engine.ts` (whether human- or LLM-authored).
- [x] The "no banned APIs" lint pass blocks a fixture that includes `Math.random`.
- [x] `--promote` is refused (non-zero exit) when any gate fails.

#### Manual Verification
- [ ] With a real API key, edit `spec.md` to change rest defaults; run `npm run llm:gen-engine:promote`; the diff in `engine.ts` reflects the spec change and tests still pass.
- [ ] Audit trail JSON is created for the run and committed alongside the change.
- [ ] Hand-editing the generated file produces a `lint-staged` warning on commit.

**Implementation Note**: Pause for manual confirmation before Phase 11.

---

## Phase 11: Polish, Accessibility, Responsiveness, PWA

### Overview
Tighten UX, accessibility, and offline support.

### Changes Required

#### 1. Accessibility
- All interactive controls have visible focus rings.
- Player exposes ARIA live regions for current exercise, time remaining (announced sparingly), and rep count.
- Color contrast ≥ 4.5:1 across the UI.
- Tab order verified across all pages.

#### 2. Responsive layout
- Verify and tune breakpoints at 375 / 768 / 1024 / 1440px.
- Player switches to a vertical layout on portrait mobile and a side-by-side layout on landscape tablet/desktop.

#### 3. Theming
- Light + dark themes via CSS custom properties; respects `prefers-color-scheme` with a manual override toggle in Settings.

#### 4. PWA
- Add `vite-plugin-pwa` with a manifest (name `reppr`, icons, theme color) and a service worker that precaches the app shell + exercise data + SVG assets so the app works offline.

#### 5. Error boundaries
- Wrap each route in an error boundary with a "Reload" button.

### Success Criteria

#### Automated Verification
- [ ] Lighthouse CI run (or `npx unlighthouse`) reports: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, PWA installable.
- [x] `npm run build` passes; `dist/` contains a valid `manifest.webmanifest` and SW.

#### Manual Verification
- [ ] Install the PWA on Chrome desktop and Android, launch offline, complete a previously generated workout.
- [ ] Tab through every page using only the keyboard; all actions reachable.
- [ ] Light/dark toggle persists across reloads.

---

## Testing Strategy

### Unit Tests
- Generator: duration ±10%, equipment filtering, body-part coverage, style-specific schemes, determinism.
- Player reducer: every state transition, edge cases (skip past end, abort mid-countdown).
- Storage adapter: round-trip, version migration.
- Enrichment schema/parser: JSON / CSV / XLSX inputs, malformed inputs, merge precedence rules.
- Speech service: queue ordering, cancel.
- **Offline guarantee**: a Vitest suite stubs `fetch` and `XMLHttpRequest` to throw and runs the full app test suite; any network attempt fails the build.

### Integration Tests
- React Testing Library: `ConfigPage` submit → generator invoked → preview rendered with expected blocks.
- `PreviewPage` swap/remove/reorder → plan updates and duration recalculated.
- `PlayerPage` smoke test with fake timers: mount, advance through one item, assert next state.

### Manual Testing Steps
1. Generate a 30-min hypertrophy dumbbell plan; confirm 4–6 main exercises × 3–4 sets, mostly 8–12 reps.
2. Start the player, complete one full block, verify beeps, TTS, animation, and rep tap.
3. Pause, navigate away, return; (acceptable behavior: returns to Config — explicit decision: in-flight session is not preserved across navigation in v1).
4. Save the plan, reload the browser, replay from history.
5. Export JSON, clear `localStorage`, import, verify everything restored.
6. Enable reduce-motion at the OS level; confirm animations freeze.
7. Install as PWA, go offline (DevTools → Network → Offline), run a saved workout end-to-end.
8. With network offline from cold start, generate a plan, import an enrichment JSON via Settings, confirm new exercises usable.

## Performance Considerations

- Exercise library is small (~30 entries); ship inline, no lazy-load.
- Code-split the `player` and `settings` routes via `React.lazy` to keep the initial bundle lean.
- SVG renderers are individual components but tree-shakeable; the registry imports them via a static map (no dynamic `import.meta.glob` to keep behavior predictable).
- `requestAnimationFrame` ticker for the player (not `setInterval`) for smooth timers and battery friendliness; clamp updates to 10 Hz for UI re-renders.

## Migration Notes

Greenfield — no migration. Storage keys are versioned (`:v1`) so a future schema change can run a one-shot migration in `src/storage/local.ts`.

## References

- Original request: user message dated 2026-05-09 (no ticket).
- User clarifications captured pre-plan: React + Vite + TS; SVG animations now with future renderer swap; localStorage persistence; configurable body-part / goal / equipment / style; beeps + TTS; project name `reppr`.
- Hard constraint added by user (2026-05-09): the running app must be fully self-sustaining and never call an LLM. LLMs may only produce portable artifacts (data files or generator source) consumed by the app.
