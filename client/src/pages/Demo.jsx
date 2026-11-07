import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AnalysisView from '../AnalysisView.jsx';

const ARCHETYPES = {
  steady: 'Steady learner', accelerating: 'Accelerating learner', surge: 'Last-minute surge', hopper: 'Topic hopper',
  unbalanced: 'Technical only (unbalanced)', stagnant: 'Low activity (stagnant)', declining: 'Dropping off (declining)',
};

export default function Demo() {
  const [archetype, setArchetype] = useState('surge');
  const [weeks, setWeeks] = useState(8);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    api(`/analysis/simulate?archetype=${archetype}&weeks=${weeks}&targetRole=software_developer`).then(setData).catch((e) => setError(e.message));
  }, [archetype, weeks]);
  return (
    <>
      <h1>Demo: what the analyzer sees</h1>
      <p className="muted">Synthetic students with the same engine as real ones. Compare how different preparation histories are scored and explained.</p>
      <div className="toolbar">
        <label>Behaviour<select value={archetype} onChange={(e) => setArchetype(e.target.value)}>{Object.entries(ARCHETYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Weeks observed<input type="number" min="2" max="12" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></label>
      </div>
      {error && <p className="error">{error}</p>}
      {data && <AnalysisView analysis={data.analysis} />}
    </>
  );
}
