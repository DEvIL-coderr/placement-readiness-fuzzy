import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AnalysisView from '../AnalysisView.jsx';

export default function Dashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/analysis/me').then(setAnalysis).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!analysis) return <p className="muted">Analysing your preparation…</p>;
  return (
    <>
      <h1>Your placement readiness</h1>
      {analysis.empty && (
        <div className="card empty">
          <p>{analysis.message}</p>
          <p><a className="button primary" href="#/practice">Start a quiz</a> <a className="button" href="#/demo">See a demo student</a></p>
        </div>
      )}
      {!analysis.empty && <AnalysisView analysis={analysis} />}
    </>
  );
}
