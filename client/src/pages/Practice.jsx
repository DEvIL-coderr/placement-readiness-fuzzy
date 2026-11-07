import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Practice() {
  const [meta, setMeta] = useState(null);
  const [cfg, setCfg] = useState({ subject: '', count: 10, difficulty: 'mixed' });
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/subjects').then(setMeta).catch((e) => setError(e.message)); }, []);

  async function start() {
    setError(''); setResult(null); setAnswers({});
    try { setQuiz(await api(`/quiz/start?subject=${cfg.subject}&count=${cfg.count}&difficulty=${cfg.difficulty}`)); }
    catch (e) { setError(e.message); }
  }
  async function submit() {
    setError('');
    try {
      const payload = { answers: quiz.questions.map((q) => ({ questionId: q.id, selectedIndex: answers[q.id] ?? -1 })) };
      setResult(await api('/quiz/submit', { method: 'POST', body: payload }));
    } catch (e) { setError(e.message); }
  }

  if (!meta) return <p className="muted">{error || 'Loading…'}</p>;

  if (result) {
    const by = Object.fromEntries(result.results.map((r) => [String(r.questionId), r]));
    return (
      <>
        <h1>Result: {result.score} / {result.total} ({result.percentage}%)</h1>
        <p className="muted">Your attempts were recorded and will update your weekly trajectory.</p>
        {quiz.questions.map((q, i) => {
          const r = by[q.id];
          return (
            <div key={q.id} className={`card q ${r?.correct ? 'ok' : 'bad'}`}>
              <p><strong>{i + 1}. {q.text}</strong> <span className="chip">{q.difficulty}</span></p>
              <ul className="opts">{q.options.map((o, k) => <li key={k} className={k === r?.correctIndex ? 'right' : k === r?.selectedIndex ? 'wrong' : ''}>{o}</li>)}</ul>
              {r?.explanation && <p className="muted small">{r.explanation}</p>}
            </div>
          );
        })}
        <p><button className="primary" onClick={() => { setQuiz(null); setResult(null); }}>Another quiz</button> <a className="button" href="#/">View dashboard</a></p>
      </>
    );
  }

  if (quiz) {
    const answered = Object.keys(answers).length;
    return (
      <>
        <h1>{meta.subjects.find((s) => s.slug === quiz.subject)?.name}</h1>
        {quiz.questions.map((q, i) => (
          <fieldset key={q.id} className="card q">
            <legend><strong>{i + 1}. {q.text}</strong> <span className="chip">{q.difficulty}</span></legend>
            {q.options.map((o, k) => (
              <label key={k} className="opt"><input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} /> {o}</label>
            ))}
          </fieldset>
        ))}
        {error && <p className="error">{error}</p>}
        <p><button className="primary" onClick={submit}>Submit ({answered}/{quiz.questions.length} answered)</button></p>
      </>
    );
  }

  return (
    <>
      <h1>Practice</h1>
      <p className="muted">Pick a subject. Unanswered questions count as incorrect. Harder questions weigh more in your mastery estimate.</p>
      <div className="subjects">
        {meta.subjects.map((s) => (
          <button key={s.slug} className={`card pick ${cfg.subject === s.slug ? 'active' : ''}`} disabled={!s.mcqCount} onClick={() => setCfg({ ...cfg, subject: s.slug })}>
            <strong>{s.name}</strong>
            <span className="muted small">{s.mcqCount} quiz questions</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label>Questions<input type="number" min="1" max="30" value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })} /></label>
        <label>Difficulty<select value={cfg.difficulty} onChange={(e) => setCfg({ ...cfg, difficulty: e.target.value })}><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <button className="primary" disabled={!cfg.subject} onClick={start}>Start quiz</button>
      </div>
      {error && <p className="error">{error}</p>}
    </>
  );
}
