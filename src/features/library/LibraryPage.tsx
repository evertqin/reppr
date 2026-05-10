import { useMemo, useState } from 'react';
import { buildLibrary } from '../../data/exercises';
import { activeUserEnrichments } from '../../storage/enrichments';
import { ExerciseAnimation } from '../../animation/registry';
import { ALL_MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../domain/types';

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  fullBody: 'Full body',
};

const SPECIAL_GROUPS = ['warmup', 'cooldown'] as const;
type GroupKey = MuscleGroup | (typeof SPECIAL_GROUPS)[number];

function classify(ex: Exercise): GroupKey[] {
  const groups: GroupKey[] = [];
  if (ex.isWarmup) groups.push('warmup');
  if (ex.isCooldown) groups.push('cooldown');
  // Group by primary muscles (so an exercise can appear under each).
  for (const m of ex.primaryMuscles) groups.push(m);
  if (groups.length === 0) groups.push('fullBody');
  return Array.from(new Set(groups));
}

interface GroupNode {
  key: GroupKey;
  label: string;
  exercises: Exercise[];
}

function buildGroups(library: Exercise[]): GroupNode[] {
  const buckets = new Map<GroupKey, Exercise[]>();
  for (const ex of library) {
    for (const g of classify(ex)) {
      const list = buckets.get(g) ?? [];
      list.push(ex);
      buckets.set(g, list);
    }
  }
  const order: GroupKey[] = ['warmup', 'cooldown', ...ALL_MUSCLE_GROUPS];
  return order
    .filter((k) => buckets.has(k))
    .map((k) => ({
      key: k,
      label:
        k === 'warmup' ? 'Warm-up' : k === 'cooldown' ? 'Cool-down' : MUSCLE_LABELS[k],
      exercises: (buckets.get(k) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function LibraryPage() {
  const lib = useMemo(() => buildLibrary(activeUserEnrichments()), []);
  const groups = useMemo(() => buildGroups(lib), [lib]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    () => groups[0]?.exercises[0]?.id ?? null,
  );
  const [openGroups, setOpenGroups] = useState<Set<GroupKey>>(
    () => new Set(groups.slice(0, 3).map((g) => g.key)),
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        exercises: g.exercises.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q) ||
            e.tags?.some((t) => t.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.exercises.length > 0);
  }, [groups, query]);

  const selected = useMemo(
    () => (selectedId ? lib.find((e) => e.id === selectedId) ?? null : null),
    [selectedId, lib],
  );

  const toggleGroup = (key: GroupKey) =>
    setOpenGroups((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="library">
      <aside className="library-tree" aria-label="Exercise groups">
        <input
          className="library-search"
          type="search"
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exercises"
        />
        <div className="muted" style={{ marginBottom: 8 }}>
          {lib.length} exercises · {groups.length} groups
        </div>
        <ul className="library-groups">
          {filteredGroups.map((g) => {
            const open = !!query || openGroups.has(g.key);
            return (
              <li key={g.key} className="library-group">
                <button
                  type="button"
                  className="library-group-header"
                  aria-expanded={open}
                  onClick={() => toggleGroup(g.key)}
                >
                  <span className="library-caret">{open ? '▾' : '▸'}</span>
                  <span>{g.label}</span>
                  <span className="muted">({g.exercises.length})</span>
                </button>
                {open && (
                  <ul className="library-items">
                    {g.exercises.map((ex) => (
                      <li key={`${g.key}:${ex.id}`}>
                        <button
                          type="button"
                          className={`library-item${selectedId === ex.id ? ' selected' : ''}`}
                          aria-current={selectedId === ex.id ? 'true' : undefined}
                          onClick={() => setSelectedId(ex.id)}
                        >
                          {ex.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="library-detail" aria-label="Exercise detail">
        {selected ? <ExerciseDetail ex={selected} /> : <p className="muted">Select an exercise.</p>}
      </section>
    </div>
  );
}

function ExerciseDetail({ ex }: { ex: Exercise }) {
  const animLoopMs = Math.max(400, Math.round(ex.tempoSecPerRep * 1000));
  return (
    <div className="library-detail-grid">
      <div className="library-anim">
        <ExerciseAnimation
          animationKey={ex.animationKey}
          loop
          loopMs={animLoopMs}
          ariaLabel={ex.name}
          scale={1}
        />
      </div>
      <div className="library-info">
        <h1 style={{ marginTop: 0 }}>{ex.name}</h1>
        <div className="row" style={{ gap: 6, marginBottom: 8 }}>
          <span className="chip-tag">{ex.difficulty}</span>
          {ex.isWarmup && <span className="chip-tag">warm-up</span>}
          {ex.isCooldown && <span className="chip-tag">cool-down</span>}
          {ex.unilateral && <span className="chip-tag">unilateral</span>}
        </div>

        <DetailRow label="Primary muscles">
          {ex.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
        </DetailRow>
        {ex.secondaryMuscles.length > 0 && (
          <DetailRow label="Secondary muscles">
            {ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
          </DetailRow>
        )}
        <DetailRow label="Equipment">{ex.equipment.join(', ')}</DetailRow>
        <DetailRow label="Default scheme">
          {ex.defaultScheme.kind === 'reps'
            ? `${ex.defaultScheme.sets} × ${ex.defaultScheme.reps} reps · ${ex.defaultScheme.restSec}s rest`
            : `${ex.defaultScheme.sets} × ${ex.defaultScheme.workSec}s work · ${ex.defaultScheme.restSec}s rest`}
        </DetailRow>
        <DetailRow label="Tempo">{ex.tempoSecPerRep}s per rep</DetailRow>
        <DetailRow label="Animation key">
          <code>{ex.animationKey}</code>
        </DetailRow>
        {ex.tags && ex.tags.length > 0 && (
          <DetailRow label="Tags">{ex.tags.join(', ')}</DetailRow>
        )}

        {ex.instructions.length > 0 && (
          <>
            <h2>How to do it</h2>
            <ol className="how-to-steps">
              {ex.instructions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </>
        )}
        {ex.cues.length > 0 && (
          <>
            <h2>Cues</h2>
            <ul className="how-to-cues-list">
              {ex.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </>
        )}
        {ex.alternateExerciseIds && ex.alternateExerciseIds.length > 0 && (
          <DetailRow label="Alternates">
            {ex.alternateExerciseIds.join(', ')}
          </DetailRow>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="library-row">
      <span className="library-row-label">{label}:</span> {children}
    </p>
  );
}
