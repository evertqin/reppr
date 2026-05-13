import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlansStore } from '../history/store';
import { buildLibrary, findExercises } from '../../data/exercises';
import { activeUserEnrichments } from '../../storage/enrichments';
import { estimateDurationSec } from '../generator';
import { ExerciseAnimation } from '../../animation/registry';
import type { Exercise, PlanBlock, PlanItem, WorkoutPlan } from '../../domain/types';

function fmtScheme(item: PlanItem, exercise: Exercise | undefined): string {
  const s = item.scheme;
  const sideNote = exercise?.unilateral ? ' each side' : '';
  if (s.kind === 'reps') {
    return s.sets > 1
      ? `${s.sets} × ${s.reps} reps${sideNote}`
      : `${s.reps} reps${sideNote}`;
  }
  return `${s.workSec}s work${sideNote} / ${s.restSec}s rest`;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
}

function blockSubtitle(block: PlanBlock): string {
  if (block.rounds > 1) return `${block.rounds} rounds × ${block.items.length} exercises`;
  return `${block.items.length} exercises`;
}

export function PreviewPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const plan = usePlansStore((s) => s.plans.find((p) => p.id === planId));
  const upsertPlan = usePlansStore((s) => s.upsertPlan);

  const lib = useMemo(() => buildLibrary(activeUserEnrichments()), []);
  const byId = useMemo(() => new Map(lib.map((e) => [e.id, e])), [lib]);

  if (!plan) {
    return (
      <div className="card">
        <h1>Plan not found</h1>
        <p className="muted">The plan may have been removed.</p>
        <button type="button" onClick={() => navigate('/')}>Back to builder</button>
      </div>
    );
  }

  const totalSec = estimateDurationSec(plan, byId);

  const updateBlock = (blockId: string, updater: (b: PlanBlock) => PlanBlock) => {
    const blocks = plan.blocks.map((b) => (b.id === blockId ? updater(b) : b));
    const next: WorkoutPlan = { ...plan, blocks };
    next.estimatedDurationSec = estimateDurationSec(next, byId);
    upsertPlan(next);
  };

  const removeItem = (blockId: string, itemId: string) =>
    updateBlock(blockId, (b) => ({ ...b, items: b.items.filter((i) => i.id !== itemId) }));

  const moveItem = (blockId: string, itemId: string, dir: -1 | 1) =>
    updateBlock(blockId, (b) => {
      const idx = b.items.findIndex((i) => i.id === itemId);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= b.items.length) return b;
      const items = b.items.slice();
      [items[idx], items[j]] = [items[j], items[idx]];
      return { ...b, items };
    });

  const swapItem = (blockId: string, itemId: string) =>
    updateBlock(blockId, (b) => {
      const items = b.items.map((i) => {
        if (i.id !== itemId) return i;
        const ex = byId.get(i.exerciseId);
        if (!ex) return i;
        const candidates = findExercises(lib, {
          equipment: plan.config.equipment.includes('none')
            ? plan.config.equipment
            : ['none', ...plan.config.equipment],
        }).filter(
          (e: Exercise) =>
            e.id !== ex.id &&
            (e.primaryMuscles.some((m) => ex.primaryMuscles.includes(m)) ||
              e.secondaryMuscles.some((m) => ex.primaryMuscles.includes(m))) &&
            !!e.isWarmup === !!ex.isWarmup &&
            !!e.isCooldown === !!ex.isCooldown,
        );
        if (candidates.length === 0) return i;
        const replacement = candidates[Math.floor(Math.random() * candidates.length)];
        return { ...i, exerciseId: replacement.id };
      });
      return { ...b, items };
    });

  return (
    <div className="card">
      <header className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{plan.name}</h1>
          <div className="muted">
            ~{fmtDuration(totalSec)} · {plan.blocks.length} blocks
          </div>
        </div>
        <div className="row">
          <button type="button" onClick={() => navigate('/')}>
            Back
          </button>
          <button type="button" className="primary" onClick={() => navigate(`/play/${plan.id}`)}>
            Start workout
          </button>
        </div>
      </header>

      {plan.blocks.map((block) => (
        <section key={block.id} className="block" aria-label={block.label}>
          <h2 style={{ marginBottom: 4 }}>{block.label}</h2>
          <div className="muted" style={{ marginBottom: 8 }}>
            {blockSubtitle(block)}
          </div>
          <ul className="plan-list">
            {block.items.map((item, idx) => {
              const ex = byId.get(item.exerciseId);
              return (
                <li key={item.id} className="plan-item">
                  <div className="plan-thumb" aria-hidden="true">
                    {ex ? (
                      <ExerciseAnimation
                        animationKey={ex.animationKey}
                        exercise={ex}
                        loop
                        scale={0.18}
                        ariaLabel=""
                      />
                    ) : (
                      '?'
                    )}
                  </div>
                  <div className="plan-meta">
                    <div className="plan-name">{ex?.name ?? item.exerciseId}</div>
                    <div className="muted">{fmtScheme(item, ex)}</div>
                    {ex && (ex.instructions.length > 0 || ex.cues.length > 0) && (
                      <details className="how-to">
                        <summary>How to do it</summary>
                        {ex.instructions.length > 0 && (
                          <ol className="how-to-steps">
                            {ex.instructions.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        )}
                        {ex.cues.length > 0 && (
                          <p className="muted how-to-cues">Cues: {ex.cues.join(' · ')}</p>
                        )}
                      </details>
                    )}
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={idx === 0}
                      onClick={() => moveItem(block.id, item.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={idx === block.items.length - 1}
                      onClick={() => moveItem(block.id, item.id, 1)}
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => swapItem(block.id, item.id)}>
                      Swap
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeItem(block.id, item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
