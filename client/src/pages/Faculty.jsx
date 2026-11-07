import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DOMAINS = [['dsa', 'DSA & coding'], ['core', 'Core subjects'], ['aptitude', 'Aptitude'], ['communication', 'Communication'], ['practical', 'Practical / projects']];
const PATTERNS = [['', 'Not sure'], ['steady_growth', 'Steady growth'], ['last_minute_surge', 'Last-minute surge'], ['skill_hopping', 'Skill hopping (jumps between topics)'], ['unbalanced_readiness', 'Unbalanced (strong in some, neglects others)'], ['stagnation_decline', 'Stagnating or declining']];
const EMPTY = { overall: '', domains: {}, pattern: '', priorities: [], notes: '' };

/** Blind rating form: shows only student names. No scores, forecasts, patterns or recommendations from the system. */
export default function Faculty() {
  const [round, setRound] = useState('R1');
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const validRound = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,29}$/.test(round);
  const loadStudents = () => validRound && api(`/faculty/students?round=${encodeURIComponent(round)}`).then((d) => setStudents(d.items)).catch((e) => setError(e.message));
  useEffect(() => { api('/subjects').then(setMeta).catch((e) => setError(e.message)); }, []);
  useEffect(() => { setCurrent(null); loadStudents(); }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  async function open(s) {
    setError(''); setMsg(''); setCurrent(s);
    try {
      const { assessment } = await api(`/faculty/assessments/${s.id}?round=${encodeURIComponent(round)}`);
      setForm(assessment ? { ...assessment, overall: String(assessment.overall), domains: Object.fromEntries(Object.entries(assessment.domains).map(([k, v]) => [k, String(v)])) } : EMPTY);
    } catch (e) { setError(e.message); }
  }
  const togglePriority = (slug) => setForm((f) => {
    const has = f.priorities.includes(slug);
    if (!has && f.priorities.length >= 3) return f;
    return { ...f, priorities: has ? f.priorities.filter((p) => p !== slug) : [...f.priorities, slug] };
  });

  async function save(e) {
    e.preventDefault(); setError(''); setMsg('');
    try {
      const domains = Object.fromEntries(Object.entries(form.domains).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
      await api('/faculty/assessments', { method: 'POST', body: { studentId: current.id, round, overall: Number(form.overall), domains, pattern: form.pattern || null, priorities: form.priorities, notes: form.notes } });
      setMsg(`Saved rating for ${current.name}.`);
      loadStudents();
    } catch (err) { setError(err.details ? `${err.message}: ${[].concat(err.details).join('; ')}` : err.message); }
  }

  return (
    <>
      <h1>Faculty rating</h1>
      <p className="muted">Rate each student from your own knowledge of their work. You will not see any score or prediction from the system; this keeps your judgement independent for the research evaluation.</p>
      <div className="toolbar">
        <label>Rating round<input value={round} onChange={(e) => setRound(e.target.value)} placeholder="R1" /></label>
        <span className="muted">{students.filter((s) => s.rated).length} of {students.length} rated in this round</span>
      </div>
      {!validRound && <p className="error">Round name: 1–30 letters, digits, space, - or _.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="grid">
        <section className="card span-4">
          <h3>Students</h3>
          <ul className="plain">
            {students.map((s) => (
              <li key={s.id}><button className={current?.id === s.id ? 'primary' : ''} onClick={() => open(s)}>{s.name}</button><span className="muted small">{s.rated ? '✓ rated' : 'not rated'}</span></li>
            ))}
          </ul>
        </section>
        <section className="card span-8">
          {!current ? <p className="muted">Choose a student.</p> : (
            <form onSubmit={save}>
              <h3>{current.name} · round {round}</h3>
              <label>Overall placement readiness (0–100)
                <input type="number" min="0" max="100" required value={form.overall} onChange={(e) => setForm({ ...form, overall: e.target.value })} />
              </label>
              <p className="muted small">0–29 not ready · 30–54 needs substantial work · 55–74 nearly ready · 75–100 ready</p>
              <div className="row">
                {DOMAINS.map(([k, label]) => (
                  <label key={k}>{label} (0–100, optional)
                    <input type="number" min="0" max="100" value={form.domains[k] ?? ''} onChange={(e) => setForm({ ...form, domains: { ...form.domains, [k]: e.target.value } })} />
                  </label>
                ))}
              </div>
              <label>Dominant preparation pattern you observe
                <select value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })}>{PATTERNS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
              </label>
              <fieldset>
                <legend className="muted small">Top priority subjects for this student (choose up to 3)</legend>
                {meta?.subjects.map((s) => (
                  <label key={s.slug} style={{ display: 'inline-block', marginRight: '1rem' }}>
                    <input type="checkbox" checked={form.priorities.includes(s.slug)} onChange={() => togglePriority(s.slug)} /> {s.name}
                  </label>
                ))}
              </fieldset>
              <label>Notes (optional, max 500 characters)<textarea rows={2} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
              <button className="primary" type="submit">Save rating</button>
              {msg && <p className="muted small" role="status">{msg}</p>}
            </form>
          )}
        </section>
      </div>
    </>
  );
}
