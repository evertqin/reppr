import { useEffect, useState } from 'react';
import { useSettingsStore } from './store';
import { EnrichmentImport } from './EnrichmentImport';

export function SettingsPage() {
  const s = useSettingsStore();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <div className="card">
      <h1>Settings</h1>

      <h2>Audio</h2>
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={s.beepsEnabled}
            onChange={(e) => s.setBeepsEnabled(e.target.checked)}
          />
          {' '}Beeps on countdown
        </label>
        <label>
          Beep volume: <strong>{Math.round(s.beepVolume * 100)}%</strong>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.beepVolume}
            onChange={(e) => s.setBeepVolume(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={s.ttsEnabled}
            onChange={(e) => s.setTtsEnabled(e.target.checked)}
          />
          {' '}Spoken cues (text-to-speech)
        </label>
        <label>
          Voice
          <select
            value={s.ttsVoice ?? ''}
            onChange={(e) => s.setTtsVoice(e.target.value || null)}
          >
            <option value="">System default</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <label>
          Rate: <strong>{s.ttsRate.toFixed(1)}x</strong>
          <input
            type="range"
            min={0.5}
            max={1.6}
            step={0.1}
            value={s.ttsRate}
            onChange={(e) => s.setTtsRate(Number(e.target.value))}
          />
        </label>
        <label>
          Volume: <strong>{Math.round(s.ttsVolume * 100)}%</strong>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.ttsVolume}
            onChange={(e) => s.setTtsVolume(Number(e.target.value))}
          />
        </label>
      </div>

      <h2>Theme</h2>
      <div className="row" role="radiogroup" aria-label="Theme">
        {(['auto', 'light', 'dark'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={s.theme === t}
            className={`chip${s.theme === t ? ' selected' : ''}`}
            onClick={() => s.setTheme(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <EnrichmentImport />
    </div>
  );
}
