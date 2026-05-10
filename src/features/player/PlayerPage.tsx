import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlansStore } from '../history/store';
import { useSettingsStore } from '../settings/store';
import { buildLibrary } from '../../data/exercises';
import { activeUserEnrichments } from '../../storage/enrichments';
import { ExerciseAnimation } from '../../animation/registry';
import { playBeep, primeAudio } from '../../audio/beeps';
import { createSpeaker } from '../../audio/speech';
import { useTicker } from './useTicker';
import { useWakeLock } from './useWakeLock';
import {
  buildSteps,
  initialState,
  reducer,
  type PlayerEvent,
  type Step,
} from './machine';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, Math.round(sec % 60));
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PlayerPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const plan = usePlansStore((s) => s.plans.find((p) => p.id === planId));
  const appendSession = usePlansStore((s) => s.appendSession);

  const lib = useMemo(() => buildLibrary(activeUserEnrichments()), []);
  const byId = useMemo(() => new Map(lib.map((e) => [e.id, e])), [lib]);
  const steps = useMemo<Step[]>(() => (plan ? buildSteps(plan, byId) : []), [plan, byId]);

  const [state, dispatch] = useReducer(reducer, steps, initialState);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const beepsEnabled = useSettingsStore((s) => s.beepsEnabled);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const ttsVolume = useSettingsStore((s) => s.ttsVolume);
  const ttsVoice = useSettingsStore((s) => s.ttsVoice);
  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const speakerRef = useRef(createSpeaker());

  // Speak / beep on transitions and when timers near zero.
  const lastIndexRef = useRef<number | null>(null);
  const lastBeepSecRef = useRef<number | null>(null);
  useEffect(() => {
    // Announce when stepIndex changes OR when entering work/rest for the first time
    // (the first step keeps stepIndex at 0 across idle → countdown → work).
    const isPlaying = state.status === 'work' || state.status === 'rest';
    if (!isPlaying) return;
    if (state.stepIndex === lastIndexRef.current) return;
    lastIndexRef.current = state.stepIndex;
    lastBeepSecRef.current = null;
    const cur = state.steps[state.stepIndex];
    if (!cur || !ttsEnabled) return;
    if (cur.kind === 'work') {
      const ex2 = byId.get(cur.exerciseId);
      if (ex2) {
        const detail =
          cur.reps != null ? `${cur.reps} reps` : `${cur.durationSec ?? 0} seconds`;
        speakerRef.current.cancel();
        speakerRef.current.speak(`${ex2.name}, ${detail}`, {
          voice: ttsVoice,
          rate: ttsRate,
          volume: ttsVolume,
        });
      }
    } else {
      speakerRef.current.cancel();
      speakerRef.current.speak(`Rest ${cur.durationSec ?? 0} seconds`, {
        voice: ttsVoice,
        rate: ttsRate,
        volume: ttsVolume,
      });
    }
  }, [state.stepIndex, state.status, state.steps, byId, ttsEnabled, ttsRate, ttsVoice, ttsVolume]);

  // Reset announcement tracker when the workout is restarted.
  useEffect(() => {
    if (state.status === 'idle' || state.status === 'finished') {
      lastIndexRef.current = null;
    }
  }, [state.status]);

  // Countdown / final-3-seconds beeps.
  useEffect(() => {
    if (!beepsEnabled) return;
    if (state.status === 'countdown') {
      const remaining = state.countdown;
      if (remaining > 0 && lastBeepSecRef.current !== remaining) {
        lastBeepSecRef.current = remaining;
        playBeep({ freq: remaining === 1 ? 1320 : 660, durationMs: 120, volume: beepVolume });
      }
      return;
    }
    if (state.status !== 'work' && state.status !== 'rest') return;
    const cur = state.steps[state.stepIndex];
    if (!cur || cur.kind === 'work' && cur.reps != null) return; // no countdown beeps for rep-based work
    const dur = cur.durationSec ?? 0;
    const remaining = Math.ceil(Math.max(0, dur - state.elapsedMs / 1000));
    if (remaining <= 3 && remaining > 0 && lastBeepSecRef.current !== remaining) {
      lastBeepSecRef.current = remaining;
      playBeep({ freq: 660, durationMs: 100, volume: beepVolume });
    }
  }, [state.status, state.elapsedMs, state.stepIndex, state.countdown, state.steps, beepsEnabled, beepVolume]);

  // Final cue.
  useEffect(() => {
    if (state.done) {
      if (ttsEnabled) {
        speakerRef.current.cancel();
        speakerRef.current.speak('Workout complete. Great job.', {
          voice: ttsVoice,
          rate: ttsRate,
          volume: ttsVolume,
        });
      }
      if (beepsEnabled) playBeep({ freq: 1320, durationMs: 250, volume: beepVolume });
    }
  }, [state.done, ttsEnabled, ttsVoice, ttsRate, ttsVolume, beepsEnabled, beepVolume]);

  useEffect(() => {
    const speaker = speakerRef.current;
    return () => speaker.cancel();
  }, []);

  useEffect(() => {
    dispatch({ type: 'setSteps', steps });
  }, [steps]);

  useTicker(
    state.status === 'work' || state.status === 'rest' || state.status === 'countdown',
    10,
    (delta) => dispatch({ type: 'tick', deltaMs: delta }),
  );

  useWakeLock(state.status === 'work' || state.status === 'rest' || state.status === 'countdown');

  useEffect(() => {
    if (state.done && plan && startedAt != null) {
      const dur = Math.round((performance.now() - startedAt) / 1000);
      appendSession({
        id: `${plan.id}:${Date.now()}`,
        planId: plan.id,
        completedAt: new Date().toISOString(),
        durationActualSec: dur,
        skippedItemIds: [],
      });
      setStartedAt(null);
    }
  }, [state.done, plan, startedAt, appendSession]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const send = (ev: PlayerEvent) => {
        e.preventDefault();
        dispatch(ev);
      };
      switch (e.key) {
        case ' ':
          if (state.status === 'paused') send({ type: 'resume' });
          else if (state.status === 'work' || state.status === 'rest') send({ type: 'pause' });
          break;
        case 'ArrowRight':
          send({ type: 'skipForward' });
          break;
        case 'ArrowLeft':
          send({ type: 'skipBack' });
          break;
        case 'r':
        case 'R':
          send({ type: 'repComplete' });
          break;
        case 'Escape':
          if (window.confirm('Abort the workout?')) dispatch({ type: 'abort' });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status]);

  if (!plan) {
    return (
      <div className="card">
        <h1>Plan not found</h1>
        <button type="button" onClick={() => navigate('/')}>
          Back
        </button>
      </div>
    );
  }

  const step = state.steps[state.stepIndex];
  const ex = step?.kind === 'work' ? byId.get(step.exerciseId) : null;
  const block = step ? plan.blocks[step.blockIndex] : null;
  const totalSteps = state.steps.length;
  const progress = totalSteps > 0 ? state.stepIndex / totalSteps : 0;

  const nextWork = state.steps
    .slice(state.stepIndex + 1)
    .find((s): s is Extract<Step, { kind: 'work' }> => s.kind === 'work');
  const nextEx = nextWork ? byId.get(nextWork.exerciseId) : null;

  const stepDurationSec = step?.durationSec ?? 0;
  const remainSec = Math.max(0, stepDurationSec - state.elapsedMs / 1000);
  const isWork = step?.kind === 'work';
  // Always loop the animation at the exercise's natural tempo so the figure performs
  // multiple reps within a long time-based step (e.g. a 45s stretch shows ~10 cycles
  // at tempoSecPerRep=4s rather than one drawn-out rep).
  const animLoop = isWork;
  const repProgress = undefined;
  const animLoopMs = ex ? Math.max(400, Math.round(ex.tempoSecPerRep * 1000)) : undefined;

  return (
    <div className="player">
      <header className="player-bar">
        <div className="row" style={{ alignItems: 'center', gap: 12, flex: 1 }}>
          <strong>{block?.label ?? '—'}</strong>
          <div className="progress" aria-label="Overall progress">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="row">
          <button type="button" onClick={() => navigate(`/preview/${plan.id}`)}>
            Exit
          </button>
        </div>
      </header>

      <div className="player-stage">
        {state.status === 'idle' && (
          <div className="player-center">
            <h2>Ready?</h2>
            <p className="muted">{plan.name}</p>
            <button
              type="button"
              className="primary"
              onClick={() => {
                primeAudio();
                setStartedAt(performance.now());
                dispatch({ type: 'start' });
              }}
            >
              Start
            </button>
          </div>
        )}
        {state.status === 'countdown' && (
          <div className="player-center">
            <div className="countdown">{state.countdown}</div>
          </div>
        )}
        {(state.status === 'work' || state.status === 'paused') &&
          step?.kind === 'work' &&
          ex && (
            <div className="player-work">
              <div className="player-anim">
                <ExerciseAnimation
                  animationKey={ex.animationKey}
                  repProgress={repProgress}
                  loop={animLoop}
                  loopMs={animLoopMs}
                  ariaLabel={ex.name}
                  scale={1}
                />
                <h2 aria-live="polite">{ex.name}</h2>
                {step.reps != null ? (
                  <>
                    <div className="big-counter" aria-live="polite">
                      {state.repsDone} / {step.reps}
                    </div>
                    <button
                      type="button"
                      className="primary big"
                      onClick={() => dispatch({ type: 'repComplete' })}
                    >
                      Tap rep
                    </button>
                  </>
                ) : (
                  <div className="big-timer">{fmtTime(remainSec)}</div>
                )}
              </div>
              <aside className="player-howto-panel" aria-label="How to do it">
                <h3>How to do it</h3>
                {ex.instructions.length > 0 && (
                  <ol className="how-to-steps">
                    {ex.instructions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
                {ex.cues.length > 0 && (
                  <>
                    <h4>Cues</h4>
                    <ul className="how-to-cues-list">
                      {ex.cues.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
              </aside>
            </div>
          )}
        {state.status === 'rest' && step?.kind === 'rest' && (
          <div className="player-center">
            <h2>REST</h2>
            <div className="big-timer">{fmtTime(remainSec)}</div>
            {nextEx && (
              <div className="next-up">
                Next: <strong>{nextEx.name}</strong>
              </div>
            )}
          </div>
        )}
        {state.status === 'finished' && (
          <div className="player-center">
            <h2>Workout complete</h2>
            <p className="muted">Nice work.</p>
            <div className="row">
              <button type="button" onClick={() => navigate('/')}>
                Home
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => navigate(`/preview/${plan.id}`)}
              >
                Back to plan
              </button>
            </div>
          </div>
        )}
      </div>

      {state.status !== 'idle' && state.status !== 'finished' && (
        <footer className="player-controls">
          <button
            type="button"
            aria-label="Skip back"
            onClick={() => dispatch({ type: 'skipBack' })}
          >
            ⏮
          </button>
          {state.status === 'paused' ? (
            <button type="button" className="primary" onClick={() => dispatch({ type: 'resume' })}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={() => dispatch({ type: 'pause' })}>
              Pause
            </button>
          )}
          <button
            type="button"
            aria-label="Skip forward"
            onClick={() => dispatch({ type: 'skipForward' })}
          >
            ⏭
          </button>
          {nextEx && (
            <span className="next-chip muted">
              Next: <strong>{nextEx.name}</strong>
            </span>
          )}
        </footer>
      )}
    </div>
  );
}
