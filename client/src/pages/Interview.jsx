import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const RATINGS = [['missed', 'Missed it'], ['partial', 'Partly right'], ['good', 'Got it']];

/** Per-student, per-browser self-assessment. Kept out of the readiness engine on purpose (unvalidated, self-reported). */
function useProgress(userId) {
  const key = `interview-progress:${userId}`;
  const [progress, setProgress] = useState({});
  useEffect(() => {
    try { setProgress(JSON.parse(localStorage.getItem(key) ?? '{}')); } catch { setProgress({}); }
  }, [key]);
  const save = (id, rating) => {
    setProgress((prev) => {
      const next = { ...prev, [id]: rating };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory */ }
      return next;
    });
  };
  return [progress, save];
}

export default function Interview() {
  const { user } = useAuth();
  const [meta, setMeta] = useState(null);
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [shown, setShown] = useState({});
  const [progress, rate] = useProgress(user?._id ?? user?.id ?? user?.email ?? 'me');

  useEffect(() => { api('/subjects').then(setMeta).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    const qs = new URLSearchParams({ type: 'descriptive', sort: 'top', limit: 50 });
    if (subject) qs.set('subject', subject);
    if (difficulty) qs.set('difficulty', difficulty);
    api(`/questions?${qs}`).then((r) => setItems(r.items)).catch((e) => setError(e.message));
  }, [subject, difficulty]);

  const done = useMemo(() => items.filter((q) => progress[q._id]).length, [items, progress]);

  return (
    <>
      <h1>Interview practice</h1>
      <p className="muted">Write your answer first, then reveal the model answer and rate yourself honestly. This is a self-assessment: it is saved in this browser only and does <strong>not</strong> change your readiness score (only auto-graded MCQ attempts do).</p>
      <div className="toolbar">
        <label>Subject<select value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">All</option>{meta?.subjects.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
        <label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">Any</option><option>easy</option><option>medium</option><option>hard</option></select></label>
        <span className="muted">{done} of {items.length} rated</span>
      </div>
      {error && <p className="error">{error}</p>}
      {!items.length && !error && <p className="muted">No interview questions for this filter yet. An admin can add them under Admin → Add question (type: Descriptive).</p>}
      {items.map((q) => (
        <article key={q._id} className="card q">
          <p><strong>{q.text}</strong></p>
          <p className="meta">
            <span className="chip">{q.subject}</span> <span className="chip">{q.difficulty}</span> {q.topic && <span className="chip">{q.topic}</span>}
            {progress[q._id] && <span className="chip">{RATINGS.find(([k]) => k === progress[q._id])?.[1]}</span>}
          </p>
          <label>Your answer<textarea rows={3} value={drafts[q._id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [q._id]: e.target.value })} placeholder="Type your answer as you would say it in an interview" /></label>
          <button onClick={() => setShown({ ...shown, [q._id]: !shown[q._id] })}>{shown[q._id] ? 'Hide model answer' : 'Show model answer'}</button>
          {shown[q._id] && (
            <div className="answer">
              <p>{q.answer}</p>
              {q.explanation && <p className="muted small">{q.explanation}</p>}
              <p className="small">How did you do? {RATINGS.map(([k, label]) => (
                <button key={k} onClick={() => rate(q._id, k)} disabled={progress[q._id] === k}>{label}</button>
              ))}</p>
            </div>
          )}
        </article>
      ))}
    </>
  );
}
