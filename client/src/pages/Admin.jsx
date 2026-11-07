import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AnalysisView from '../AnalysisView.jsx';

const EMPTY = { subject: 'dsa', type: 'mcq', text: '', optionsText: '', correctIndex: 0, answer: '', explanation: '', difficulty: 'medium', topic: '', frequency: 50, rankSource: 'editorial', active: true };

function QuestionsTab() {
  const [meta, setMeta] = useState(null);
  const [filter, setFilter] = useState({ subject: '', q: '' });
  const [data, setData] = useState({ items: [], total: 0 });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [bulk, setBulk] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)), limit: 30 });
    api(`/questions?${qs}`).then(setData).catch((e) => setMsg(e.message));
  };
  useEffect(() => { api('/subjects').then(setMeta); }, []);
  useEffect(load, [filter]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function toBody() {
    const body = { subject: form.subject, type: form.type, text: form.text, difficulty: form.difficulty, topic: form.topic, frequency: Number(form.frequency), rankSource: form.rankSource, active: form.active, explanation: form.explanation };
    if (form.type === 'mcq') { body.options = form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean); body.correctIndex = Number(form.correctIndex); }
    else body.answer = form.answer;
    return body;
  }
  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      if (editing) await api(`/questions/${editing}`, { method: 'PUT', body: toBody() });
      else await api('/questions', { method: 'POST', body: toBody() });
      setMsg(editing ? 'Question updated.' : 'Question added.');
      setForm(EMPTY); setEditing(null); load();
    } catch (err) { setMsg(`${err.message}${err.details ? ` — ${JSON.stringify(err.details.fieldErrors ?? err.details)}` : ''}`); }
  }
  function edit(q) {
    setEditing(q._id);
    setForm({ subject: q.subject, type: q.type, text: q.text, optionsText: (q.options ?? []).join('\n'), correctIndex: q.correctIndex ?? 0, answer: q.answer ?? '', explanation: q.explanation ?? '', difficulty: q.difficulty, topic: q.topic ?? '', frequency: q.frequency, rankSource: q.rankSource ?? 'editorial', active: q.active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function remove(q) {
    if (!window.confirm('Delete this question?')) return;
    await api(`/questions/${q._id}`, { method: 'DELETE' });
    load();
  }
  const [csv, setCsv] = useState('');
  async function importCsv() {
    setMsg('');
    try {
      const r = await api('/questions/import-csv', { method: 'POST', body: { csv } });
      setMsg(`Imported ${r.inserted}, duplicates ${r.duplicates}, invalid ${r.invalid.length}`);
      setCsv('');
      load?.();
    } catch (e) { setMsg(e.message); }
  }
  async function importBulk() {
    setMsg('');
    try {
      const parsed = JSON.parse(bulk);
      const res = await api('/questions/bulk', { method: 'POST', body: { questions: Array.isArray(parsed) ? parsed : parsed.questions } });
      setMsg(`Imported ${res.inserted}, duplicates skipped ${res.duplicates}, invalid ${res.invalid.length}.`);
      load();
    } catch (err) { setMsg(`Import failed: ${err.message}`); }
  }

  return (
    <>
      <form className="card" onSubmit={save}>
        <h3>{editing ? 'Edit question' : 'Add question'}</h3>
        <div className="row">
          <label>Subject<select value={form.subject} onChange={set('subject')}>{meta?.subjects.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
          <label>Type<select value={form.type} onChange={set('type')}><option value="mcq">MCQ (auto-graded)</option><option value="descriptive">Descriptive (interview Q&amp;A)</option></select></label>
          <label>Difficulty<select value={form.difficulty} onChange={set('difficulty')}><option>easy</option><option>medium</option><option>hard</option></select></label>
          <label>Frequency (0–100)<input type="number" min="0" max="100" value={form.frequency} onChange={set('frequency')} /></label>
          <label>Frequency source<select value={form.rankSource} onChange={set('rankSource')}><option value="editorial">Editorial estimate</option><option value="expert">Expert / faculty</option><option value="placement_records">Placement records</option></select></label>
        </div>
        <label>Question<textarea value={form.text} onChange={set('text')} required minLength={8} rows={2} /></label>
        {form.type === 'mcq' ? (
          <div className="row">
            <label className="grow">Options (one per line)<textarea value={form.optionsText} onChange={set('optionsText')} rows={4} /></label>
            <label>Correct option # (0 = first)<input type="number" min="0" max="5" value={form.correctIndex} onChange={set('correctIndex')} /></label>
          </div>
        ) : <label>Model answer<textarea value={form.answer} onChange={set('answer')} rows={4} /></label>}
        <div className="row">
          <label className="grow">Explanation<input value={form.explanation} onChange={set('explanation')} /></label>
          <label>Topic<input value={form.topic} onChange={set('topic')} /></label>
          <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Active</label>
        </div>
        <p><button className="primary">{editing ? 'Save changes' : 'Add question'}</button> {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}</p>
        {msg && <p className="muted small" role="status">{msg}</p>}
      </form>

      <details className="card">
        <summary>Bulk import (JSON)</summary>
        <p className="muted small">Paste an array of question objects (same fields as the API). Duplicates are detected automatically by normalised text.</p>
        <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder='[{"subject":"dsa","type":"mcq","text":"…","options":["a","b"],"correctIndex":0,"difficulty":"easy","frequency":80}]' />
        <p><button onClick={importBulk} disabled={!bulk.trim()}>Import</button></p>
      </details>

      <details className="card">
        <summary>Bulk import (CSV)</summary>
        <p className="muted small">Header: subject,type,text,option1..option6,correct (A–F or 1–6),answer,explanation,difficulty,topic,frequency,rankSource. Max 500 rows.</p>
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <p><input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0]?.text().then(setCsv)} /> <button onClick={importCsv} disabled={csv.trim().length < 10}>Import CSV</button></p>
      </details>

      <div className="toolbar">
        <label>Subject<select value={filter.subject} onChange={(e) => setFilter({ ...filter, subject: e.target.value })}><option value="">All</option>{meta?.subjects.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
        <label>Search<input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} /></label>
        <span className="muted">{data.total} questions</span>
      </div>
      <table>
        <thead><tr><th>Question</th><th>Subject</th><th>Type</th><th>Level</th><th>Freq</th><th /></tr></thead>
        <tbody>{data.items.map((q) => (
          <tr key={q._id} className={q.active ? '' : 'inactive'}>
            <td>{q.text}</td><td>{q.subject}</td><td>{q.type}</td><td>{q.difficulty}</td><td>{q.frequency}</td>
            <td className="actions"><button onClick={() => edit(q)}>Edit</button> <button onClick={() => remove(q)}>Delete</button></td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [detail, setDetail] = useState(null);
  const [rating, setRating] = useState({});
  const [msg, setMsg] = useState('');
  const load = () => api('/admin/students').then((d) => setStudents(d.students));
  useEffect(() => { load(); }, []);

  async function view(id) { setDetail(await api(`/analysis/students/${id}`)); }
  async function rate(id) {
    setMsg('');
    try { await api('/admin/ratings', { method: 'POST', body: { studentId: id, rating: Number(rating[id]) } }); setMsg('Rating saved.'); setRating({ ...rating, [id]: '' }); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function refresh() { const r = await api('/admin/refresh', { method: 'POST' }); setMsg(`Refreshed ${r.refreshed} students.`); load(); }

  return (
    <>
      <p><button onClick={refresh}>Refresh all analyses</button> <span className="muted small" role="status">{msg}</span></p>
      <table>
        <thead><tr><th>Student</th><th>Target</th><th>Readiness</th><th>Forecast</th><th>Pattern</th><th>Faculty rating (0–100)</th><th /></tr></thead>
        <tbody>{students.map((s) => (
          <tr key={s.id}>
            <td>{s.name}<div className="muted small">{s.email}</div></td><td>{s.targetRole}</td>
            <td>{s.score === null ? '—' : Math.round(s.score)}</td><td>{s.projected === null ? '—' : Math.round(s.projected)}</td><td>{s.pattern ?? '—'}</td>
            <td><input className="narrow" type="number" min="0" max="100" value={rating[s.id] ?? ''} onChange={(e) => setRating({ ...rating, [s.id]: e.target.value })} /> <button disabled={rating[s.id] === undefined || rating[s.id] === ''} onClick={() => rate(s.id)}>Save</button></td>
            <td><button onClick={() => view(s.id)}>Analysis</button></td>
          </tr>
        ))}</tbody>
      </table>
      {detail && (
        <section className="card">
          <h3>{detail.student.name} <button onClick={() => setDetail(null)}>Close</button></h3>
          <AnalysisView analysis={detail.analysis} />
        </section>
      )}
    </>
  );
}

function ResearchTab() {
  const [stats, setStats] = useState(null);
  const [cal, setCal] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api('/admin/stats').then(setStats); }, []);

  async function fit() {
    setMsg('');
    try { const r = await api('/admin/calibration/fit', { method: 'POST' }); setCal(r.calibration); setMsg('Calibration saved and applied to all dashboards.'); }
    catch (e) { setMsg(e.message); }
  }
  async function clear() { await api('/admin/calibration', { method: 'DELETE' }); setCal(null); setMsg('Calibration removed (raw scores shown).'); }
  async function download() {
    const res = await api('/admin/export/dataset.csv', { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = 'prep-snapshots.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid">
      <section className="card span-6">
        <h3>Study data</h3>
        {stats ? <ul className="plain"><li><span>Students</span><strong>{stats.students}</strong></li><li><span>Questions</span><strong>{stats.questions}</strong></li><li><span>Recorded attempts</span><strong>{stats.attempts}</strong></li><li><span>Faculty ratings</span><strong>{stats.ratings}</strong></li></ul> : <p className="muted">Loading…</p>}
        <p><button onClick={download}>Download dataset (CSV)</button></p>
        <p className="muted small">One row per student per day with all engine outputs and the matching faculty rating. Use it for the baseline comparison, ablation and agreement statistics in the paper.</p>
      </section>
      <section className="card span-6">
        <h3>Calibrate against faculty ratings</h3>
        <p className="muted small">The raw fuzzy score is an ordinal indicator. After faculty rate at least 5 students (Students tab), fit a linear map so scores align with their judgement.</p>
        <p><button className="primary" onClick={fit}>Fit calibration</button> <button onClick={clear}>Remove calibration</button></p>
        {cal && <p className="small">score′ = {cal.intercept.toFixed(2)} + {cal.slope.toFixed(3)} × score (n = {cal.n}, MAE {cal.mae.toFixed(2)})</p>}
        {msg && <p className="muted small" role="status">{msg}</p>}
      </section>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('questions');
  return (
    <>
      <h1>Admin</h1>
      <nav className="tabs" role="tablist">
        {[['questions', 'Question bank'], ['students', 'Students'], ['research', 'Research data']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      {tab === 'questions' && <QuestionsTab />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'research' && <ResearchTab />}
    </>
  );
}
