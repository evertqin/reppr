# Lottie animations

Drop a Lottie JSON file here named `<animationKey>.json` (e.g. `squat.json`) and it will automatically replace the SVG stick-figure renderer for that exercise.

## Where to get files

- **Free / CC0**: https://lottiefiles.com/free-animations/fitness — filter by license. Verify the license badge on each asset before bundling.
- **Paid bundles**: many fitness Lottie packs are sold for a one-time fee on LottieFiles, IconScout, or marketplaces.
- **Author your own**: export from After Effects via the Bodymovin plugin, or use Rive → export to Lottie.

## Naming

The filename **must match** the `animationKey` of an exercise (see `src/data/exercises.seed.ts`). Examples:

| File                      | Replaces SVG renderer for                       |
| ------------------------- | ----------------------------------------------- |
| `squat.json`              | squat (and aliases like `goblet-squat`)         |
| `pushup.json`             | pushup, pike-pushup, dip                        |
| `dumbbell-curl.json`      | dumbbell-curl, pullup, dumbbell-row             |
| `jumping-jack.json`       | jumping-jack, lateral-raise, band-pull-apart    |
| `plank.json`              | plank, hollow-hold, superman, bird-dog, cat-cow |

Aliases live in [`src/animation/svg/renderers.tsx`](../svg/renderers.tsx) under `ANIMATION_ALIASES`.

## Tempo

The Lottie runtime auto-syncs playback to the player's `loopMs` (which is derived from each exercise's `tempoSecPerRep`). One full Lottie cycle = one rep.

## Bundle impact

- Each JSON: typically 2–30 KB.
- The `lottie-react` runtime (~95 KB gzipped) is **code-split** and only loaded the first time a Lottie animation is shown. If you don't drop any files in this folder, the runtime never ships to users.

## Stability / license check

Before committing third-party Lotties:

1. Verify the asset's license permits commercial / redistributed use.
2. Open the JSON and ensure no external URL references (Lottie can reference remote images — we want self-contained vector data).
3. Test in `npm run dev`; confirm playback at 200×300 pixels.
