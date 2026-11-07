import { Bars, Gauge, LineChart, LinkGrid, Radar } from './charts.jsx';

const SHORT = { dsa: 'DSA', core: 'Core CS', aptitude: 'Aptitude', communication: 'Comm.', practical: 'Practical' };
const PATTERN_COLORS = {
  steady_growth: 'var(--zone-4)',
  last_minute_surge: 'var(--zone-2)',
  skill_hopping: 'var(--zone-2)',
  unbalanced_readiness: 'var(--zone-2)',
  stagnation_decline: 'var(--zone-1)',
};
const PATTERN_NAMES = {
  steady_growth: 'Steady growth',
  last_minute_surge: 'Last-minute surge',
  skill_hopping: 'Skill hopping',
  unbalanced_readiness: 'Unbalanced readiness',
  stagnation_decline: 'Stagnation / decline',
};
const DESCRIPTOR_NAMES = {
  momentum: ['Momentum (points / week)', -10, 10],
  consistency: ['Consistency', 0, 100],
  balance: ['Balance across domains', 0, 100],
  surge: ['Last-minute surge', 0, 100],
  hopping: ['Topic hopping (orphan links)', 0, 100],
};

export default function AnalysisView({ analysis }) {
  if (analysis.empty) return <p className="muted">{analysis.message}</p>;
  const { readiness: r, meta, domains, trajectory, stages, recommendations, advice, explanation, linkograph, subjects } = analysis;
  const labels = trajectory.series.map((p) => p.date.slice(5));
  const radarItems = Object.entries(domains).map(([k, v]) => ({ label: v.label, short: SHORT[k], value: v.mastery }));

  return (
    <div className="grid">
      <section className="card span-4">
        <h3>Readiness today</h3>
        <Gauge score={r.score} low={r.low} high={r.high} label={r.label} />
        <p className="big-label">{r.label}</p>
        <p className="muted small">Uncertainty band {Math.round(r.low)}–{Math.round(r.high)} · evidence confidence {Math.round(meta.confidence * 100)}%{meta.calibrated ? ' · calibrated' : ' · uncalibrated'}</p>
        <div className="forecast">
          <span>Forecast in {meta.horizonWeeks} wk</span>
          <strong>{Math.round(r.projected)}</strong>
          <span className="muted small">{r.projectedLabel} ({Math.round(r.projectedLow)}–{Math.round(r.projectedHigh)})</span>
        </div>
        <p className="muted small">Target role: {meta.roleLabel} · {meta.weeks} week{meta.weeks === 1 ? '' : 's'} of data</p>
      </section>

      <section className="card span-8">
        <h3>Weekly trajectory</h3>
        <LineChart
          labels={labels}
          series={[
            { name: 'Readiness', color: 'var(--accent)', values: trajectory.series.map((p) => p.readiness) },
            { name: 'Forecast at horizon', color: 'var(--zone-2)', dash: '5 4', values: trajectory.series.map((p) => p.projected) },
            { name: 'Skill state', color: 'var(--zone-3)', values: trajectory.series.map((p) => p.skillState) },
          ]}
        />
      </section>

      <section className="card span-4">
        <h3>Competency domains</h3>
        <Radar items={radarItems} />
        <Bars items={Object.entries(domains).map(([k, v]) => ({ label: v.label, value: v.mastery }))} max={100} format={(v) => `${Math.round(v)}%`} />
      </section>

      <section className="card span-4">
        <h3>Preparation pattern</h3>
        <p className="big-label">{trajectory.patternLabel}</p>
        <Bars items={Object.entries(trajectory.patterns).map(([k, v]) => ({ label: PATTERN_NAMES[k], value: v, color: PATTERN_COLORS[k] }))} />
        <h4>Descriptors</h4>
        <ul className="plain small">
          {Object.entries(DESCRIPTOR_NAMES).map(([k, [name]]) => <li key={k}><span>{name}</span><strong>{trajectory.descriptors[k]}</strong></li>)}
        </ul>
      </section>

      <section className="card span-4">
        <h3>What to do next</h3>
        {recommendations.length === 0 && <p className="muted">No urgent gaps. Keep your routine going.</p>}
        <ol className="reco">
          {recommendations.map((rec) => (
            <li key={rec.slug}>
              <strong>{rec.name}</strong> <span className="chip">priority {rec.priority.toFixed(2)}</span>
              <div className="muted small">{rec.reasons.join(' · ') || 'monitor'}</div>
            </li>
          ))}
        </ol>
        {advice.map((a) => <p key={a.pattern} className="advice"><strong>{a.label}:</strong> {a.text}</p>)}
      </section>

      <section className="card span-6">
        <h3>Fuzzy preparation linkograph</h3>
        <p className="muted small">Strength of links between your practice moves (topic relatedness AND recency). Isolated moves show up as topic hopping. Orphan ratio: {Math.round(linkograph.orphanRatio * 100)}% · density {linkograph.density}</p>
        <LinkGrid subjects={subjects} matrix={linkograph.subjectMatrix} />
      </section>

      <section className="card span-6">
        <h3>Why this score?</h3>
        <p className="muted small">Pipeline: technical {stages.technical} · non-technical {stages.nontechnical} → skill state {stages.skillState}; trajectory quality {stages.trajectoryQuality} → readiness. Strongest fuzzy rules fired:</p>
        <ul className="rules">
          {explanation.map((e, i) => <li key={i}><span className="chip">{e.stage}</span> {e.text} <em>({e.strength})</em></li>)}
        </ul>
      </section>
    </div>
  );
}
