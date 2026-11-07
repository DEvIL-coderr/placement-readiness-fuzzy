import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyze, linkograph, theilSen } from '../src/engine/analyze.js';
import { deckFuzzy } from '../src/engine/baselines.js';
import { applyCalibration, fitLinear } from '../src/engine/calibration.js';
import { ENGINE_DEFAULTS } from '../src/engine/config.js';
import { MamdaniSystem, FuzzyVariable, trapmf, trimf } from '../src/engine/fuzzy.js';
import { mulberry32, simulateCohort, simulateStudent } from '../src/engine/simulate.js';
import { LEVELS, MOMENTUM_SETS, SS, SYSTEMS, TQ, READINESS, rescale } from '../src/engine/systems.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

// ---------- helpers to hand-build series ----------
function mkWeek(week, perSubject, accuracy) {
  const subjects = {};
  for (const [slug, n] of Object.entries(perSubject)) {
    if (n > 0) subjects[slug] = { attempted: n, wattempted: n * 2, wcorrect: n * 2 * accuracy };
  }
  return { week, date: `2026-01-${String(5 + week * 7).padStart(2, '0')}`, subjects, practical: null };
}
const ALL = ['dsa', 'coding', 'oop', 'dbms', 'os', 'cn', 'web', 'quant', 'logical', 'verbal', 'hr'];
const spread = (total) => Object.fromEntries(ALL.map((s) => [s, total / ALL.length]));

test('membership functions: shoulders and peaks', () => {
  assert.equal(trimf(0, 0, 50)(0), 1);
  assert.equal(trimf(60, 100, 100)(100), 1);
  near(trimf(30, 50, 75)(40), 0.5);
  assert.equal(trapmf(0, 0, 25, 50)(10), 1);
  near(trapmf(0, 0, 25, 50)(37.5), 0.5);
});

test('level sets form a partition of unity on [0,100]', () => {
  for (let x = 0; x <= 100; x += 0.5) near(LEVELS.low(x) + LEVELS.medium(x) + LEVELS.high(x), 1);
  for (let x = -10; x <= 10; x += 0.25) near(MOMENTUM_SETS.declining(x) + MOMENTUM_SETS.flat(x) + MOMENTUM_SETS.rising(x), 1);
});

test('rule bases are complete (9, 9, 27, 27, 9) and never degenerate', () => {
  assert.deepEqual(Object.values(SYSTEMS).map((s) => s.rules.length), [9, 9, 27, 27, 9]);
  for (let a = 0; a <= 100; a += 10) for (let b = 0; b <= 100; b += 10) for (let c = 0; c <= 100; c += 25) {
    assert.equal(SS.infer({ technical: a, nontechnical: b, practical: c }).degenerate, false);
  }
  for (let m = -10; m <= 10; m += 2) for (let c = 0; c <= 100; c += 20) for (let b = 0; b <= 100; b += 20) {
    assert.equal(TQ.infer({ momentum: m, consistency: c, balance: b }).degenerate, false);
  }
});

// Mamdani + centroid defuzzification is not strictly monotone: small ripples (measured <= 0.9 points
// of 100 on a fine grid) are a known property of the method. We assert monotonicity up to that tolerance
// and, separately, a clear overall increase.
test('skill state is monotone non-decreasing in every input (within centroid ripple tolerance)', () => {
  const grid = [0, 15, 30, 45, 60, 75, 90, 100];
  for (const base of [{ technical: 50, nontechnical: 50, practical: 50 }, { technical: 20, nontechnical: 80, practical: 30 }]) {
    for (const key of Object.keys(base)) {
      let prev = -Infinity;
      for (const v of grid) {
        const out = SS.infer({ ...base, [key]: v }).crisp;
        assert.ok(out >= prev - 1.5, `${key}=${v}: ${out} < ${prev}`);
        prev = out;
      }
      assert.ok(prev - SS.infer({ ...base, [key]: 0 }).crisp > 3 || key === 'practical', `${key} has almost no effect`);
    }
  }
});

test('technical gate: weak technical strength caps the skill state', () => {
  const weakTech = SS.infer({ technical: 10, nontechnical: 95, practical: 95 }).crisp;
  const strong = SS.infer({ technical: 95, nontechnical: 95, practical: 95 }).crisp;
  assert.ok(weakTech < 40 && strong > 80);
});

test('rescale maps centroid extremes to 0 and 100', () => {
  near(rescale(100 / 12), 0);
  near(rescale(100 - 100 / 12), 100);
});

test('custom Mamdani system matches a hand computation', () => {
  const v = new FuzzyVariable('x', [0, 10], { lo: trimf(0, 0, 10), hi: trimf(0, 10, 10) });
  const o = new FuzzyVariable('y', [0, 10], { lo: trimf(0, 0, 10), hi: trimf(0, 10, 10) });
  const sys = new MamdaniSystem({ name: 't', inputs: { x: v }, output: o, rules: [{ if: [['x', 'lo']], then: 'lo' }, { if: [['x', 'hi']], then: 'hi' }] });
  near(sys.infer({ x: 5 }).crisp, 5, 1e-6); // symmetric
  assert.ok(sys.infer({ x: 9 }).crisp > 6.5);
});

test('prototype baseline reproduces an independent numpy recomputation (61.62)', () => {
  const r = deckFuzzy({ coding: 72, dsa: 48, aptitude: 66, communication: 82 });
  near(r.score, 61.6186, 1e-3);
});

test('prototype baseline silently fails when no rule fires (coverage gap)', () => {
  const r = deckFuzzy({ coding: 50, dsa: 80, aptitude: 50, communication: 50 });
  assert.equal(r.noRuleFired, true);
  // the proposed hierarchical rule bases cover this input
  assert.equal(SS.infer({ technical: 65, nontechnical: 50, practical: 50 }).degenerate, false);
});

test('theilSen recovers slope and resists an outlier', () => {
  near(theilSen([0, 1, 2, 3, 4], [0, 2, 4, 6, 8]), 2);
  const s = theilSen([0, 1, 2, 3, 4], [0, 2, 4, 60, 8]);
  assert.ok(s > 1.5 && s < 2.5);
});

test('analyze: empty input is handled', () => {
  assert.equal(analyze([]).empty, true);
});

test('analyze: outputs are bounded and uncertainty band contains the score', () => {
  const { series } = simulateStudent('steady', mulberry32(5));
  const r = analyze(series.slice(0, 8));
  for (const v of [r.readiness.score, r.readiness.sensitivityLow, r.readiness.sensitivityHigh, r.readiness.projected]) assert.ok(v >= 0 && v <= 100);
  assert.ok(r.readiness.sensitivityLow <= r.readiness.score && r.readiness.score <= r.readiness.sensitivityHigh);
  assert.ok(r.readiness.projectedSensitivityLow <= r.readiness.projected && r.readiness.projected <= r.readiness.projectedSensitivityHigh);
});

test('analyze: is deterministic', () => {
  const { series } = simulateStudent('hopper', mulberry32(9));
  assert.deepEqual(analyze(series.slice(0, 8)), analyze(series.slice(0, 8)));
});

test('sensitivity band narrows as evidence accumulates', () => {
  const { series } = simulateStudent('steady', mulberry32(11));
  const early = analyze(series.slice(0, 2));
  const late = analyze(series.slice(0, 10));
  assert.ok(early.meta.evidenceSufficiency < late.meta.evidenceSufficiency);
  assert.ok(early.readiness.sensitivityHigh - early.readiness.sensitivityLow >= late.readiness.sensitivityHigh - late.readiness.sensitivityLow);
});

test('same totals, different trajectories: steady vs last-minute surge', () => {
  const steady = Array.from({ length: 8 }, (_, w) => mkWeek(w, spread(66), 0.7));
  const surge = Array.from({ length: 8 }, (_, w) => mkWeek(w, spread(w < 6 ? 2 : 240), 0.7));
  const a = analyze(steady);
  const b = analyze(surge);
  assert.ok(b.trajectory.patterns.last_minute_surge >= 0.6, 'surge not detected');
  assert.ok(a.trajectory.patterns.last_minute_surge < 0.1);
  assert.ok(a.stages.trajectoryQuality > b.stages.trajectoryQuality, 'steady should have higher trajectory quality');
});

test('linkograph: coherent progression has fewer orphans than random topic hopping', () => {
  const coherent = ['dsa', 'coding', 'dsa', 'oop', 'coding', 'dsa', 'coding', 'oop'].map((s, w) => mkWeek(w, { [s]: 30 }, 0.6));
  const hopping = ['dsa', 'hr', 'os', 'quant', 'web', 'verbal', 'cn', 'logical'].map((s, w) => mkWeek(w, { [s]: 30 }, 0.6));
  const c = linkograph(coherent, ENGINE_DEFAULTS);
  const h = linkograph(hopping, ENGINE_DEFAULTS);
  assert.ok(c.orphanRatio < h.orphanRatio, `${c.orphanRatio} vs ${h.orphanRatio}`);
  assert.ok(h.orphanRatio >= 0.5);
});

test('unassessed domains reduce balance and are flagged as unbalanced', () => {
  const techOnly = Array.from({ length: 6 }, (_, w) => mkWeek(w, { dsa: 20, coding: 20, oop: 10, dbms: 10, os: 10, cn: 10, web: 10 }, 0.7));
  const r = analyze(techOnly);
  assert.ok(r.trajectory.patterns.unbalanced_readiness >= 0.5);
  assert.ok(r.advice.some((a) => a.pattern === 'unbalanced_readiness'));
});

test('recommendations: weak, high-weight, neglected subject ranks first; role changes order', () => {
  const weeks = Array.from({ length: 6 }, (_, w) => mkWeek(w, { dsa: 15, coding: 15, oop: 10, dbms: 10, os: 10, cn: 10, web: 10, quant: 10, logical: 10, hr: 10 }, 0.8));
  // verbal never practised
  const dev = analyze(weeks, { targetRole: 'software_developer' });
  const svc = analyze(weeks, { targetRole: 'it_services' });
  assert.ok(dev.recommendations[0].reasons.length > 0);
  const prio = (res) => res.recommendations.find((r) => r.slug === 'verbal').priority;
  assert.equal(svc.recommendations[0].slug, 'verbal');
  assert.ok(prio(svc) > prio(dev), 'verbal should matter more for IT services');
  assert.ok(svc.recommendations.every((r) => r.priority >= 0.05), 'subjects with no need are not recommended');
});

test('forecast exceeds current score for a rising, consistent student and not for a declining one', () => {
  const rising = Array.from({ length: 8 }, (_, w) => mkWeek(w, spread(66), 0.4 + w * 0.06));
  const falling = Array.from({ length: 8 }, (_, w) => mkWeek(w, spread(66), 0.85 - w * 0.07));
  const up = analyze(rising);
  const down = analyze(falling);
  assert.ok(up.readiness.projected > up.readiness.score);
  assert.ok(down.readiness.projected <= down.readiness.score + 1e-9);
});

test('calibration: fits a linear map and clamps to 0..100', () => {
  const pairs = Array.from({ length: 20 }, (_, i) => ({ score: i * 4, rating: 10 + i * 4 * 1.2 }));
  const cal = fitLinear(pairs);
  near(cal.slope, 1.2, 1e-9);
  near(cal.intercept, 10, 1e-9);
  assert.equal(applyCalibration(100, cal), 100);
  assert.equal(fitLinear(pairs.slice(0, 3)), null);
});

test('simulator is reproducible and surge archetype is detected', () => {
  const a = simulateCohort({ perArchetype: 2, seed: 3 });
  const b = simulateCohort({ perArchetype: 2, seed: 3 });
  assert.deepEqual(a[0].series, b[0].series);
  const surgers = simulateCohort({ perArchetype: 30, seed: 8 }).filter((s) => s.archetype === 'surge');
  const hits = surgers.filter((s) => analyze(s.series.slice(0, 8), { fullSeries: false }).trajectory.patterns.last_minute_surge >= 0.4).length;
  assert.ok(hits / surgers.length >= 0.8, `only ${hits}/${surgers.length}`);
});

test('READINESS system orders outcomes sensibly', () => {
  const lo = READINESS.infer({ skill_state: 10, trajectory: 10 }).crisp;
  const mid = READINESS.infer({ skill_state: 50, trajectory: 50 }).crisp;
  const hi = READINESS.infer({ skill_state: 90, trajectory: 90 }).crisp;
  assert.ok(lo < mid && mid < hi);
});

// ---------- v2: role-specific readiness, staleness, validation ----------
import { buildStates, validateSeries } from '../src/engine/analyze.js';
import { SYSTEMS as SYS2, configFingerprint } from '../src/engine/systems.js';

test('readiness is role-specific: strong DB/aptitude, weak DSA scores higher for data analyst than software developer', () => {
  const weeks = Array.from({ length: 6 }, (_, w) => mkWeek(w, { dsa: 12, coding: 12, oop: 8, dbms: 14, os: 4, cn: 4, web: 4, quant: 14, logical: 14, verbal: 8, hr: 8 }, 0.5));
  // make DSA/coding weak, DBMS/quant/logical strong
  for (const wk of weeks) {
    for (const s of ['dsa', 'coding']) wk.subjects[s].wcorrect = wk.subjects[s].wattempted * 0.3;
    for (const s of ['dbms', 'quant', 'logical']) wk.subjects[s].wcorrect = wk.subjects[s].wattempted * 0.9;
  }
  const r = analyze(weeks, { targetRole: 'software_developer' });
  assert.ok(r.roles.data_analyst.score > r.roles.software_developer.score, JSON.stringify(r.roles));
  assert.equal(r.roles.software_developer.score, r.readiness.score);
  assert.equal(Object.keys(r.roles).length, 5);
});

test('general role equals plain pooling (weights normalised)', () => {
  const weeks = Array.from({ length: 4 }, (_, w) => mkWeek(w, spread(66), 0.6));
  const a = buildStates(weeks, { ...ENGINE_DEFAULTS, roleWeights: undefined });
  const b = buildStates(weeks, { ...ENGINE_DEFAULTS, roleWeights: Object.fromEntries(ALL.map((s) => [s, 0.7])) });
  near(a[3].domains.core.mastery, b[3].domains.core.mastery);
});

test('stale project/mock evidence fades toward the prior', () => {
  const mk = (n) => Array.from({ length: n }, (_, w) => ({ ...mkWeek(w, spread(66), 0.6), practical: w === 0 ? { projects: 95, mock: 95 } : null }));
  const fresh = buildStates(mk(1), ENGINE_DEFAULTS)[0].domains.practical.mastery;
  const stale = buildStates(mk(17), ENGINE_DEFAULTS)[16].domains.practical.mastery;
  assert.ok(fresh > 90);
  assert.ok(stale < 60 && stale > ENGINE_DEFAULTS.priorMean - 1, `${stale}`);
});

test('invalid records are rejected instead of silently distorting the engine', () => {
  assert.throws(() => analyze([{ week: 0, date: 'x', subjects: { dsa: { attempted: 5, wattempted: 10, wcorrect: 12 } } }]), RangeError);
  assert.throws(() => analyze([{ week: 0, date: 'x', subjects: { dsa: { attempted: NaN, wattempted: 1, wcorrect: 0 } } }]), RangeError);
  assert.throws(() => validateSeries([{ week: 0, subjects: {}, practical: { projects: 140 } }]), RangeError);
});

test('missing/non-finite fuzzy inputs throw instead of being replaced by a midpoint', () => {
  assert.throws(() => SYS2.TS.infer({ dsa: undefined, core: 50 }), TypeError);
  assert.throws(() => SYS2.TS.infer({ dsa: NaN, core: 50 }), TypeError);
});

test('result carries engine version and a stable configuration fingerprint', () => {
  const { series } = simulateStudent('steady', mulberry32(2));
  const r = analyze(series.slice(0, 6), { byRole: false });
  assert.equal(r.meta.engineVersion, '2.0.0');
  assert.match(r.meta.configHash, /^[0-9a-f]{12}$/);
  assert.equal(configFingerprint({ ...ENGINE_DEFAULTS }), r.meta.configHash);
  assert.notEqual(configFingerprint({ ...ENGINE_DEFAULTS, damping: 0.9 }), r.meta.configHash);
});

test('separate trajectory descriptors are reported', () => {
  const { series } = simulateStudent('steady', mulberry32(4));
  const d = analyze(series.slice(0, 8), { byRole: false }).trajectory.descriptors;
  for (const k of ['momentum', 'practiceRegularity', 'scoreVolatility', 'acceleration', 'switchRate', 'practiceEntropy', 'topicDiversity', 'balance', 'surge', 'hopping']) {
    assert.ok(Number.isFinite(d[k]), k);
  }
});
