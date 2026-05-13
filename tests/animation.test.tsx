import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseAnimation, hasRenderer } from '../src/animation/registry';
import { SVG_RENDERERS } from '../src/animation/svg/renderers';
import type { Exercise } from '../src/domain/types';

const DUMBBELL_ROW: Exercise = {
  id: 'test-row',
  name: 'Test Row',
  primaryMuscles: ['back'],
  secondaryMuscles: ['biceps'],
  equipment: ['dumbbells'],
  difficulty: 'advanced',
  unilateral: true,
  animationKey: 'dumbbell-row',
  cues: [],
  instructions: [],
  tempoSecPerRep: 3,
  defaultScheme: { kind: 'reps', reps: 10, sets: 3, restSec: 60 },
};

describe('animation registry', () => {
  it('returns fallback for unknown key without throwing', () => {
    const html = renderToStaticMarkup(
      <ExerciseAnimation animationKey="this-does-not-exist" ariaLabel="x" />,
    );
    expect(html).toContain('<svg');
  });

  it('hasRenderer reports true for direct keys and aliases', () => {
    expect(hasRenderer('squat')).toBe(true);
    expect(hasRenderer('goblet-squat')).toBe(true); // alias -> squat
    expect(hasRenderer('totally-fake')).toBe(false);
  });

  it('all registered SVG renderers produce non-empty SVG at progress 0/0.5/1', () => {
    // Iterate the SVG renderer map directly. The high-level registry may prefer a
    // Lottie file when one exists for the same key, which is an SSR <div> wrapper
    // around a lazy-loaded component — exercised separately in the registry test.
    for (const [key, Renderer] of Object.entries(SVG_RENDERERS)) {
      for (const p of [0, 0.5, 1]) {
        const html = renderToStaticMarkup(
          <Renderer animationKey={key} repProgress={p} ariaLabel={key} />,
        );
        expect(html).toContain('<svg');
        expect(html).toMatch(/<circle[^>]*\/?>/);
        expect(html.length).toBeGreaterThan(100);
      }
    }
  });

  it('renders dumbbell and active-side metadata cues', () => {
    const html = renderToStaticMarkup(
      <ExerciseAnimation
        animationKey="dumbbell-row"
        exercise={DUMBBELL_ROW}
        side="left"
        ariaLabel="left row"
      />,
    );
    expect(html).toContain('<svg');
    expect(html).toContain('>L</text>');
    expect(html).toContain('fill="#f8fafc"');
    expect(html).toContain('stroke="#050816"');
  });
});
