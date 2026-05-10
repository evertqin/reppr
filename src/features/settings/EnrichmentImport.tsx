import { useRef, useState } from 'react';
import { parseEnrichment } from '../../data/enrichmentSchema';
import { useEnrichmentStore } from '../../storage/enrichments';

const MAX_BYTES = 1024 * 1024;
const MAX_ENTRIES = 1000;

function csvToDoc(text: string): unknown {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV must include a header row and at least one data row.');
  const cols = parseCsvLine(lines[0]);
  const exercises = lines.slice(1).map((line, idx) => {
    const cells = parseCsvLine(line);
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      const raw = cells[i];
      if (raw === undefined || raw === '') return;
      // pipe-encoded arrays (e.g. cues|cues|cues)
      if (raw.includes('|')) obj[c] = raw.split('|').map((s) => s.trim()).filter(Boolean);
      else if (raw === 'true' || raw === 'false') obj[c] = raw === 'true';
      else if (!Number.isNaN(Number(raw)) && /^-?\d+(\.\d+)?$/.test(raw)) obj[c] = Number(raw);
      else obj[c] = raw;
    });
    if (!obj.id) throw new Error(`CSV row ${idx + 2} missing id`);
    return obj;
  });
  return { schemaVersion: 1, source: 'csv-import', exercises };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === ',') { out.push(cur); cur = ''; }
    else if (ch === '"') inQ = true;
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function EnrichmentImport() {
  const sources = useEnrichmentStore((s) => s.sources);
  const addSource = useEnrichmentStore((s) => s.addSource);
  const removeSource = useEnrichmentStore((s) => s.removeSource);
  const setEnabled = useEnrichmentStore((s) => s.setEnabled);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      if (file.size > MAX_BYTES) throw new Error('File too large (>1 MB).');
      const text = await file.text();
      let raw: unknown;
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.json')) raw = JSON.parse(text);
      else if (lower.endsWith('.csv')) raw = csvToDoc(text);
      else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        // Lazy-load XLSX support so it stays out of the initial bundle.
        // The 'xlsx' package is optional; if not installed, we surface a friendly error.
        let xlsx: { read: (...args: unknown[]) => unknown; utils: { sheet_to_csv: (s: unknown) => string } };
        try {
          // Hide the specifier from Vite/Rollup static analysis; xlsx is an optional
          // dev-power-user dependency that may not be installed.
          const specifier = 'xlsx';
          const mod = (await import(/* @vite-ignore */ specifier)) as {
            default?: typeof xlsx;
          } & typeof xlsx;
          xlsx = mod.default ?? mod;
        } catch {
          throw new Error('XLSX support requires the optional `xlsx` package. Install it or convert to JSON/CSV.');
        }
        const wb = xlsx.read(await file.arrayBuffer(), { type: 'array' }) as { Sheets: Record<string, unknown>; SheetNames: string[] };
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        raw = csvToDoc(csv);
      } else {
        throw new Error('Unsupported file type. Use .json, .csv, or .xlsx.');
      }
      const doc = parseEnrichment(raw);
      if (doc.exercises.length > MAX_ENTRIES) {
        throw new Error(`Too many entries (>${MAX_ENTRIES}).`);
      }
      addSource({
        id: `${file.name}:${Date.now()}`,
        name: file.name,
        importedAt: new Date().toISOString(),
        enabled: true,
        doc,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Exercise database</h2>
      <p className="muted">
        Import portable enrichment files (JSON, CSV, or XLSX). Files never leave your device.
      </p>
      <div className="row">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? 'Importing…' : 'Import file'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      )}
      <ul className="plan-list" style={{ marginTop: 12 }}>
        {sources.length === 0 && <li className="muted">No imported sources.</li>}
        {sources.map((s) => (
          <li key={s.id} className="plan-item">
            <div className="plan-thumb" aria-hidden="true">DB</div>
            <div className="plan-meta">
              <div className="plan-name">{s.name}</div>
              <div className="muted">
                {s.doc.exercises.length} entries · {new Date(s.importedAt).toLocaleString()}
              </div>
            </div>
            <div className="row">
              <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => setEnabled(s.id, e.target.checked)}
                />
                Enabled
              </label>
              <button type="button" className="danger" onClick={() => removeSource(s.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
