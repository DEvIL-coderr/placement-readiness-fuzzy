import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Questions() {
  const [meta, setMeta] = useState(null);
  const [f, setF] = useState({ subject: '', difficulty: '', type: '', q: '', sort: 'top' });
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { api('/subjects').then(setMeta).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [f]);
  useEffect(() => {
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page, limit: 15 });
    api(`/questions?${qs}`).then(setData).catch((e) => setError(e.message));
  }, [f, page]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <h1>Top questions</h1>
      <p className="muted">Ranked by how often they appear in placement rounds (curated by your admin).</p>
      <div className="toolbar">
        <label>Subject<select value={f.subject} onChange={set('subject')}><option value="">All</option>{meta?.subjects.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
        <label>Difficulty<select value={f.difficulty} onChange={set('difficulty')}><option value="">Any</option><option>easy</option><option>medium</option><option>hard</option></select></label>
        <label>Type<select value={f.type} onChange={set('type')}><option value="">Any</option><option value="mcq">MCQ</option><option value="descriptive">Interview Q&amp;A</option></select></label>
        <label>Sort<select value={f.sort} onChange={set('sort')}><option value="top">Most frequent</option><option value="new">Newest</option></select></label>
        <label>Search<input value={f.q} onChange={set('q')} placeholder="keyword" /></label>
      </div>
      {error && <p className="error">{error}</p>}
      {data.items.map((q) => (
        <article key={q._id} className="card q">
          <p><strong>{q.text}</strong></p>
          <p className="meta">
            <span className="chip">{q.subject}</span> <span className="chip">{q.difficulty}</span> {q.topic && <span className="chip">{q.topic}</span>}
            <span className="freq" title="Frequency score">★ {q.frequency}</span>
          </p>
          <button onClick={() => setOpen({ ...open, [q._id]: !open[q._id] })}>{open[q._id] ? 'Hide answer' : 'Show answer'}</button>
          {open[q._id] && (
            <div className="answer">
              {q.type === 'mcq' ? <><p className="right-ans">Answer: {q.options[q.correctIndex]}</p><ul className="opts">{q.options.map((o, i) => <li key={i} className={i === q.correctIndex ? 'right' : ''}>{o}</li>)}</ul></> : <p>{q.answer}</p>}
              {q.explanation && <p className="muted small">{q.explanation}</p>}
            </div>
          )}
        </article>
      ))}
      <p className="pager">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="muted">Page {data.page} / {data.pages || 1} · {data.total} questions</span>
        <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
      </p>
    </>
  );
}
