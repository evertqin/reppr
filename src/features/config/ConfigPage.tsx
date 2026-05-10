import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useConfigStore } from './store';
import { usePlansStore } from '../history/store';
import { generatePlan } from '../generator';
import { buildLibrary } from '../../data/exercises';
import { activeUserEnrichments } from '../../storage/enrichments';
import type {
  Difficulty,
  Equipment,
  Goal,
  MuscleGroup,
  Style,
} from '../../domain/types';

const BODY_PART_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
  { value: 'core', label: 'Core' },
  { value: 'fullBody', label: 'Full body' },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'bands', label: 'Resistance bands' },
  { value: 'pullupBar', label: 'Pull-up bar' },
  { value: 'bench', label: 'Bench' },
  { value: 'barbell', label: 'Barbell' },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'fatLoss', label: 'Fat loss' },
  { value: 'mobility', label: 'Mobility' },
];

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: 'straightSets', label: 'Straight sets' },
  { value: 'circuit', label: 'Circuit' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'tabata', label: 'Tabata' },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function ConfigPage() {
  const draft = useConfigStore((s) => s.draft);
  const setDraft = useConfigStore((s) => s.setDraft);
  const upsertPlan = usePlansStore((s) => s.upsertPlan);
  const navigate = useNavigate();

  const onGenerate = () => {
    const lib = buildLibrary(activeUserEnrichments());
    const plan = generatePlan(draft, lib);
    plan.createdAt = new Date().toISOString();
    upsertPlan(plan);
    navigate(`/preview/${plan.id}`);
  };

  return (
    <div className="card">
      <h1>Build a workout</h1>

      <div className="field">
        <label htmlFor="duration">
          Duration: <strong>{draft.durationMin} min</strong>
        </label>
        <input
          id="duration"
          type="range"
          min={5}
          max={90}
          step={5}
          value={draft.durationMin}
          onChange={(e) => setDraft({ durationMin: Number(e.target.value) })}
        />
      </div>

      <div className="field">
        <label>Body parts (leave empty for full body)</label>
        <div className="row">
          {BODY_PART_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={clsx('chip', draft.bodyParts.includes(opt.value) && 'selected')}
              aria-pressed={draft.bodyParts.includes(opt.value)}
              onClick={() => setDraft({ bodyParts: toggle(draft.bodyParts, opt.value) })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Goal</label>
        <div className="row" role="radiogroup" aria-label="Goal">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={draft.goal === opt.value}
              className={clsx('chip', draft.goal === opt.value && 'selected')}
              onClick={() => setDraft({ goal: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Equipment (bodyweight always available)</label>
        <div className="row">
          {EQUIPMENT_OPTIONS.map((opt) => {
            const selected = draft.equipment.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={clsx('chip', selected && 'selected')}
                aria-pressed={selected}
                onClick={() =>
                  setDraft({
                    equipment: ['none', ...toggle(draft.equipment.filter((e) => e !== 'none'), opt.value)],
                  })
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label>Style</label>
        <div className="row" role="radiogroup" aria-label="Style">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={draft.style === opt.value}
              className={clsx('chip', draft.style === opt.value && 'selected')}
              onClick={() => setDraft({ style: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Difficulty</label>
        <div className="row" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={draft.difficulty === d}
              className={clsx('chip', draft.difficulty === d && 'selected')}
              onClick={() => setDraft({ difficulty: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {draft.equipment.some((e) => e !== 'none') && (
        <div className="field">
          <label htmlFor="bw-ratio">
            Bodyweight share:{' '}
            <strong>{Math.round((draft.bodyweightRatio ?? 0.5) * 100)}%</strong>{' '}
            <span className="muted">
              ({Math.round((1 - (draft.bodyweightRatio ?? 0.5)) * 100)}% equipped)
            </span>
          </label>
          <input
            id="bw-ratio"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.bodyweightRatio ?? 0.5}
            onChange={(e) => setDraft({ bodyweightRatio: Number(e.target.value) })}
          />
        </div>
      )}

      <div className="row">
        <button type="button" className="primary" onClick={onGenerate}>
          Generate plan
        </button>
      </div>
    </div>
  );
}
