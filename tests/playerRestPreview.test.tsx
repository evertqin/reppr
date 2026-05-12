import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SEED_EXERCISES } from '../src/data/exercises.seed';
import { RestExercisePreview } from '../src/features/player/PlayerPage';
import type { Step } from '../src/features/player/machine';

const pushup = SEED_EXERCISES.find((exercise) => exercise.id === 'pushup');
const singleArmRow = SEED_EXERCISES.find((exercise) => exercise.id === 'single-arm-dumbbell-row');

const nextWork: Extract<Step, { kind: 'work' }> = {
  kind: 'work',
  blockIndex: 0,
  round: 1,
  itemIndex: 0,
  exerciseId: 'pushup',
  reps: 12,
  durationSec: 36,
};

describe('RestExercisePreview', () => {
  it('shows the next exercise demonstration, tips, cues, and target', () => {
    expect(pushup).toBeDefined();

    const html = renderToStaticMarkup(<RestExercisePreview exercise={pushup!} step={nextWork} />);

    expect(html).toContain('Next up');
    expect(html).toContain(pushup!.name);
    expect(html).toContain('12 reps');
    expect(html).toContain(`${pushup!.name} demonstration`);
    expect(html).toContain('Tips');
    expect(html).toContain(pushup!.instructions[0]);
    expect(html).toContain('Cues');
    expect(html).toContain(pushup!.cues[0]);
  });

  it('marks side-specific next exercises with (R) or (L)', () => {
    expect(singleArmRow).toBeDefined();

    const html = renderToStaticMarkup(
      <RestExercisePreview exercise={singleArmRow!} step={{ ...nextWork, side: 'right' }} />,
    );

    expect(html).toContain('Single-Arm Dumbbell Row (R)');
    expect(html).toContain('Single-Arm Dumbbell Row (R) demonstration');
  });
});
