# reppr generator engine — spec

This document is the source of truth for the rule-based plan generator implemented in
`src/features/generator/engine.ts`. The LLM gen-engine CLI consumes this spec and produces
an `engine.generated.ts` candidate; the candidate is promoted only if all gates (compile,
generator test suite, ESLint, banned-API scan) pass.

## Inputs / outputs

- Input: `ConfigInput` (see `src/domain/types.ts`).
- Input: a readonly `Exercise[]` library.
- Input: optional `{ seed?: number; rng?: Rng }` (RNG is injected; never `Math.random`).
- Output: a `WorkoutPlan` whose `estimatedDurationSec` is within ±25% of `durationMin*60` for
  all non-tabata configs and within ±60% for tabata.

## Invariants

- Pure: no `fetch`, `process`, `globalThis`, `Date.now`, `Math.random`. All randomness via the
  injected RNG.
- Deterministic: same seed + library + config produce byte-equal JSON output.
- No `any` types.

## Algorithm (10 steps)

1. **Filter library by equipment + difficulty.** Equipment filter: every `ex.equipment[i]` must
   be in `config.equipment ∪ {none}`. Difficulty filter: `rank(ex.difficulty) ≤ rank(config.difficulty)`.
   Widen difficulty by one tier if pool < 4.
2. **Pick warm-up.** 3 exercises × 30 s from the warmup pool. Skip if `durationMin < 15` or
   style is `tabata`.
3. **Pick cool-down.** 2-3 stretches × 40 s. Skip for `tabata`.
4. **Compute main-block budget** = `durationMin*60 − warmupSec − cooldownSec − bufferSec` where
   bufferSec is small (≈30).
5. **Choose template by style:**
   - `straightSets`: 4-6 exercises, `setsPerItem` scales with duration:
     `<15min ⇒ 2`, `<30min ⇒ 3`, `<45min ⇒ 4`, `else ⇒ 5`. Block rounds = 1.
     Within-item rest = `75 × goal.restMul`. Inter-item rest ≈ 15 s.
   - `circuit`: 5-6 exercises × `clamp(round(durationMin/10), 3, 6)` rounds (2 if `<15min`).
     Item sets = 1. Inter-item 30 s. Inter-round 60 s.
   - `hiit`: 6-8 exercises × `clamp(round(durationMin/12), 3, 5)` rounds (2 if `<15min`).
     `40 s work / 20 s rest`. Item sets = 1.
   - `tabata`: 8 exercises × 8 rounds (scale rounds to 2-8 if `durationMin < 16`).
     `20 s work / 10 s rest`. Item sets = 1.
6. **Apply goal modifiers** to the chosen scheme (rep range and rest multiplier):
   - strength: reps 4-6, restMul 1.4
   - hypertrophy: reps 8-12, restMul 1.0
   - endurance: reps 15-20, restMul 0.7 (also workSec × 1.2 for non-tabata time-based)
   - fatLoss: reps 10-15, restMul 0.7
   - mobility: reps 8-12, restMul 0.8
7. **Apply difficulty scale** to reps: beginner 0.85, intermediate 1.0, advanced 1.2.
8. **Select main exercises** to cover requested `bodyParts` evenly. Round-robin across muscle
   buckets; if a bucket is exhausted, repeat from it to maintain body-part majority. If
   `bodyParts` is empty, draw broadly from the pool. Avoid back-to-back same-muscle items
   when distinct ids are available.
9. **Estimate duration** by summing `(work + rest)*sets*rounds + transitions`. Time-based items
   keep `sets=1` on the scheme; rounds drive repetition via the block.
10. **Adjust** by trimming or appending main items (cap 12, floor 3) until the plan lands within
    ±20% of target. Skip adjustment for tabata (fixed structure).

## Public surface

- `export function generatePlan(config, library, options): WorkoutPlan`
- `export function estimateDurationSec(plan, byId): number`
