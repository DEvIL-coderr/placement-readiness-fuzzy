/** Dependency-free SVG charts. */
const ZONES = [
  { from: 0, to: 35, color: 'var(--zone-1)' },
  { from: 35, to: 55, color: 'var(--zone-2)' },
  { from: 55, to: 75, color: 'var(--zone-3)' },
  { from: 75, to: 100, color: 'var(--zone-4)' },
];

const polar = (cx, cy, r, v) => {
  const a = Math.PI * (1 - v / 100);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
};
const arc = (cx, cy, r, v0, v1) => {
  const [x0, y0] = polar(cx, cy, r, v0);
  const [x1, y1] = polar(cx, cy, r, v1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

/** Semicircle gauge with an uncertainty band. */
export function Gauge({ score, low, high, label }) {
  const cx = 120, cy = 118, r = 92;
  const [nx, ny] = polar(cx, cy, r - 14, score);
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label={`Readiness ${Math.round(score)} out of 100, ${label}`} className="gauge">
      {ZONES.map((z) => <path key={z.from} d={arc(cx, cy, r, z.from, z.to)} stroke={z.color} strokeWidth="14" fill="none" opacity="0.35" />)}
      {low !== undefined && high !== undefined && <path d={arc(cx, cy, r, low, Math.max(high, low + 0.5))} stroke="var(--ink)" strokeWidth="14" fill="none" opacity="0.85" />}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="var(--accent)" />
      <text x={cx} y={cy + 28} textAnchor="middle" className="gauge-num">{Math.round(score)}</text>
    </svg>
  );
}

/** Multi-series line chart on a fixed 0-100 scale. */
export function LineChart({ series, labels, height = 220 }) {
  const W = 560, H = height, P = { l: 34, r: 12, t: 12, b: 26 };
  const n = Math.max(1, labels.length - 1);
  const x = (i) => P.l + ((W - P.l - P.r) * i) / n;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / 100);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly trajectory chart">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={y(g)} y2={y(g)} stroke="var(--line)" />
            <text x={P.l - 6} y={y(g) + 4} textAnchor="end" className="tick">{g}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1) && <text key={l + i} x={x(i)} y={H - 6} textAnchor="middle" className="tick">{l}</text>)}
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color}><title>{`${s.name}: ${Math.round(v)}`}</title></circle>)}
          </g>
        ))}
      </svg>
      <figcaption className="legend">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</figcaption>
    </figure>
  );
}

/** Radar of competency domains. */
export function Radar({ items }) {
  const S = 260, c = S / 2, R = 92;
  const pt = (i, v) => {
    const a = (2 * Math.PI * i) / items.length - Math.PI / 2;
    return [c + (R * v) / 100 * Math.cos(a), c + (R * v) / 100 * Math.sin(a)];
  };
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="radar" role="img" aria-label="Competency radar">
      {[25, 50, 75, 100].map((g) => <polygon key={g} points={items.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="var(--line)" />)}
      {items.map((it, i) => { const [x, y] = pt(i, 100); return <line key={it.label} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />; })}
      <polygon points={items.map((it, i) => pt(i, it.value).join(',')).join(' ')} fill="var(--accent)" fillOpacity="0.22" stroke="var(--accent)" strokeWidth="2" />
      {items.map((it, i) => {
        const [x, y] = pt(i, 122);
        return <text key={it.label} x={x} y={y} textAnchor="middle" className="tick">{it.short}</text>;
      })}
    </svg>
  );
}

/** Horizontal bars for 0..1 memberships or 0..100 values. */
export function Bars({ items, max = 1, format = (v) => v.toFixed(2) }) {
  return (
    <ul className="bars">
      {items.map((it) => (
        <li key={it.label}>
          <span className="bar-label">{it.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(100, (100 * it.value) / max)}%`, background: it.color ?? 'var(--accent)' }} /></span>
          <span className="bar-val">{format(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Subject x subject heat-grid of fuzzy link strengths (fuzzy preparation linkograph). */
export function LinkGrid({ subjects, matrix }) {
  const keys = subjects.map((s) => s.slug);
  const get = (a, b) => matrix[[a, b].sort().join('|')] ?? 0;
  const peak = Math.max(1, ...Object.values(matrix));
  return (
    <div className="linkgrid" style={{ gridTemplateColumns: `repeat(${keys.length + 1}, minmax(0, 1fr))` }} role="table" aria-label="Link strength between subjects">
      <span />
      {keys.map((k) => <span key={k} className="lg-head">{k}</span>)}
      {keys.map((a) => (
        <div key={a} style={{ display: 'contents' }}>
          <span className="lg-head lg-row">{a}</span>
          {keys.map((b) => {
            const v = a === b ? 0 : get(a, b);
            return <span key={b} className="lg-cell" title={`${a} ↔ ${b}: ${v.toFixed(1)}`} style={{ opacity: a === b ? 0.08 : 0.08 + 0.92 * (v / peak) }} />;
          })}
        </div>
      ))}
    </div>
  );
}
