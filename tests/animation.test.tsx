import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseAnimation, hasRenderer, getRenderer } from '../src/animation/registry';
import { SVG_RENDERERS } from '../src/animation/svg/renderers';

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
    for (const key of Object.keys(SVG_RENDERERS)) {
      const Renderer = getRenderer(key);
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
});
