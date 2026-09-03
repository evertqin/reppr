import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildLibrary } from '../../data/exercises';
import { activeUserEnrichments } from '../../storage/enrichments';
import { estimateDurationSec } from '../generator';
import { usePlansStore } from '../history/store';
import {
  HYPERTROPHY_PROGRAM,
  buildProgramExerciseLookup,
  createProgramPlan,
  ensureProgramExercisesExist,
  getProgramDay,
  getScheduledPrimaryDay,
  normalizeLoggedReps,
  resolveExerciseTarget,
} from './model';
import { useProgramStore } from './store';

function fmtWeight(weightLb: number): string {
  if (weightLb <= 0) return 'Bodyweight';
  return `${weightLb} lb each`;
}

export function MyProgramPage() {
  const navigate = useNavigate();
  const upsertPlan = usePlansStore((state) => state.upsertPlan);

  const sessionCursor = useProgramStore((state) => state.sessionCursor);
  const selectedDayId = useProgramStore((state) => state.selectedDayId);
  const selectDay = useProgramStore((state) => state.selectDay);
  const logs = useProgramStore((state) => state.logs);

  const library = useMemo(() => buildLibrary(activeUserEnrichments()), []);
  const byId = useMemo(
    () => new Map(library.map((exercise) => [exercise.id, exercise])),
    [library],
  );
  const missingExerciseIds = useMemo(
    () => ensureProgramExercisesExist(HYPERTROPHY_PROGRAM, byId),
    [byId],
  );

  const scheduledDay = getScheduledPrimaryDay(HYPERTROPHY_PROGRAM, sessionCursor);
  const selectedDay = selectedDayId
    ? getProgramDay(HYPERTROPHY_PROGRAM, selectedDayId) ?? scheduledDay
    : scheduledDay;

  const week = Math.min(
    HYPERTROPHY_PROGRAM.weeks,
    Math.floor(sessionCursor / HYPERTROPHY_PROGRAM.primaryDaysPerWeek) + 1,
  );
  const sessionNumber = sessionCursor + 1;

  const latestByExercise = buildProgramExerciseLookup(logs);
  const exerciseTargets = Object.fromEntries(
    selectedDay.exercises.map((exercise) => {
      const key = `${selectedDay.id}:${exercise.exerciseId}`;
      const last = latestByExercise[key];
      const previousReps = normalizeLoggedReps(last);
      const target = resolveExerciseTarget({
        program: HYPERTROPHY_PROGRAM,
        template: exercise,
        week,
        previousReps,
        previousWeightLb: last?.targetWeightLb,
      });
      return [exercise.exerciseId, target];
    }),
  );

  const plan = createProgramPlan({
    program: HYPERTROPHY_PROGRAM,
    day: selectedDay,
    week,
    sessionNumber,
    exerciseTargets,
  });
  plan.estimatedDurationSec = estimateDurationSec(plan, byId);

  const onStartWorkout = () => {
    upsertPlan(plan);
    navigate(`/play/${plan.id}`);
  };

  return (
    <div className="card">
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>My Program</h1>
          <div className="muted" style={{ fontSize: '1rem' }}>
            {HYPERTROPHY_PROGRAM.name}
          </div>
          <div className="muted">
            Week {week} of {HYPERTROPHY_PROGRAM.weeks}
          </div>
        </div>
        <button type="button" className="primary" onClick={onStartWorkout}>
          Start workout
        </button>
      </header>

      {missingExerciseIds.length > 0 && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          Missing exercise IDs in library: {missingExerciseIds.join(', ')}
        </p>
      )}

      <section className="program-today">
        <h2 style={{ marginBottom: 4 }}>Today</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {selectedDay.label} · ~{Math.round(plan.estimatedDurationSec / 60)} min
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          {selectedDay.focus}
        </p>
      </section>

      <section className="program-day-select" aria-label="Choose session day">
        <h3>Choose a different day</h3>
        <div className="row">
          {HYPERTROPHY_PROGRAM.days.map((day) => {
            const active = day.id === selectedDay.id;
            return (
              <button
                key={day.id}
                type="button"
                className={active ? 'chip selected' : 'chip'}
                onClick={() => selectDay(day.id)}
                aria-pressed={active}
              >
                {day.label}
              </button>
            );
          })}
          {selectedDayId && (
            <button type="button" onClick={() => selectDay(null)}>
              Back to scheduled day
            </button>
          )}
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 10 }}>Session Overview</h3>
        <ul className="plan-list">
          {selectedDay.exercises.map((exercise) => {
            const target = exerciseTargets[exercise.exerciseId];
            const previous =
              target.previousReps.length > 0
                ? target.previousReps.join(' / ')
                : 'No previous data';
            return (
              <li key={exercise.exerciseId} className="plan-item">
                <div className="plan-thumb" aria-hidden="true">
                  {target.targetWeightLb > 0 ? `${target.targetWeightLb}` : 'BW'}
                </div>
                <div className="plan-meta">
                  <div className="plan-name">
                    {byId.get(exercise.exerciseId)?.name ?? exercise.exerciseId}
                  </div>
                  <div className="muted">
                    {fmtWeight(target.targetWeightLb)} x {target.repRange.min}-{target.repRange.max} x{' '}
                    {exercise.sets} · Rest {exercise.restSec}s
                  </div>
                  <div className="muted">Last time: {previous}</div>
                  <div className="muted">Today&apos;s goal: {target.nextSessionTarget}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <footer style={{ marginTop: 16 }}>
        <button type="button" className="primary" onClick={onStartWorkout}>
          Start workout
        </button>
      </footer>
    </div>
  );
}
