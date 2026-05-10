import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlansStore } from './store';
import { validateExportBundle } from '../../storage/exportImport';

export function HistoryPage() {
  const plans = usePlansStore((s) => s.plans);
  const sessions = usePlansStore((s) => s.sessions);
  const removePlan = usePlansStore((s) => s.removePlan);
  const importAll = usePlansStore((s) => s.importAll);
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'plans' | 'sessions'>('plans');
  const [error, setError] = useState<string | null>(null);

  const onExport = () => {
    const bundle = {
      schemaVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      plans,
      sessions,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reppr-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const bundle = validateExportBundle(JSON.parse(text));
      importAll({ plans: bundle.plans, sessions: bundle.sessions });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const exportPlan = (planId: string) => {
    const p = plans.find((pl) => pl.id === planId);
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>History</h1>
        <div className="row">
          <button type="button" onClick={onExport}>
            Export all
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {error && (
        <p style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      )}

      <div className="row" role="tablist" style={{ marginTop: 12 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plans'}
          className={`chip${tab === 'plans' ? ' selected' : ''}`}
          onClick={() => setTab('plans')}
        >
          Saved plans ({plans.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sessions'}
          className={`chip${tab === 'sessions' ? ' selected' : ''}`}
          onClick={() => setTab('sessions')}
        >
          Completed sessions ({sessions.length})
        </button>
      </div>

      {tab === 'plans' && (
        <ul className="plan-list" style={{ marginTop: 12 }}>
          {plans.length === 0 && <li className="muted">No saved plans yet.</li>}
          {plans.map((p) => (
            <li key={p.id} className="plan-item">
              <div className="plan-thumb" aria-hidden="true">
                {p.config.style.slice(0, 2).toUpperCase()}
              </div>
              <div className="plan-meta">
                <div className="plan-name">{p.name}</div>
                <div className="muted">
                  {new Date(p.createdAt).toLocaleString()} · ~
                  {Math.round(p.estimatedDurationSec / 60)} min
                </div>
              </div>
              <div className="row">
                <button type="button" onClick={() => navigate(`/preview/${p.id}`)}>
                  Open
                </button>
                <button type="button" onClick={() => navigate(`/play/${p.id}`)}>
                  Play
                </button>
                <button type="button" onClick={() => exportPlan(p.id)}>
                  Export
                </button>
                <button type="button" className="danger" onClick={() => removePlan(p.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'sessions' && (
        <ul className="plan-list" style={{ marginTop: 12 }}>
          {sessions.length === 0 && <li className="muted">No completed sessions yet.</li>}
          {sessions.map((sess) => {
            const p = plans.find((pl) => pl.id === sess.planId);
            return (
              <li key={sess.id} className="plan-item">
                <div className="plan-thumb" aria-hidden="true">
                  ✓
                </div>
                <div className="plan-meta">
                  <div className="plan-name">{p?.name ?? sess.planId}</div>
                  <div className="muted">
                    {new Date(sess.completedAt).toLocaleString()} ·{' '}
                    {Math.round(sess.durationActualSec / 60)} min
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
