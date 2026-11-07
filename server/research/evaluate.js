/**
 * Simulation-based evaluation: baselines, ablations, per-pattern breakdown and
 * input-noise sensitivity. Run:  node research/evaluate.js
 *
 * Ground truth = latent true readiness of the simulated student at the placement
 * horizon. This is a SIMULATION (see src/engine/simulate.js); it validates the
 * evaluation machinery and the engine's behaviour, not real-world accuracy.
 */
import fs from 'node:fs';
import { analyze, buildStates, domainValues, readinessFrom } from '../src/engine/analyze.js';
import { deckFuzzy, staticWeighted } from '../src/engine/baselines.js';
import { ENGINE_DEFAULTS } from '../src/engine/config.js';
import { ARCHETYPES, mulberry32, simulateCohort } from '../src/engine/simulate.js';
import { auc, bootstrapMaeDiff, f1AtThreshold, mae, mean, rmse, spearman } from './stats.js';
import { theilSen } from '../src/engine/analyze.js';

const SEED = 42;
const PER_ARCH = 100;
const H = ENGINE_DEFAULTS.horizonWeeks; // 4
const THRESH = 60;
const cohort = simulateCohort({ perArchetype: PER_ARCH, seed: SEED, weeks: 12 });

/** 2-fold cross-fitted linear calibration (same treatment for every model, incl. baselines). */
function crossCalibrate(pred, truth, folds) {
  const fit = (idx) => {
    const x = idx.map((i) => pred[i]);
    const y = idx.map((i) => truth[i]);
    const mx = mean(x), my = mean(y);
    let num = 0, den = 0;
    x.forEach((xi, j) => { num += (xi - mx) * (y[j] - my); den += (xi - mx) ** 2; });
    const b = den ? num / den : 0;
    return (v) => Math.min(100, Math.max(0, my + b * (v - mx)));
  };
  const out = new Array(pred.length);
  for (const f of [0, 1]) {
    const train = pred.map((_, i) => i).filter((i) => folds[i] !== f);
    const map = fit(train);
    pred.forEach((p, i) => { if (folds[i] === f) out[i] = map(p); });
  }
  return out;
}

function predictAll(k, task, H) {
  const models = { 'B0 Static weighted': [], 'B1 Static fuzzy (prototype)': [], 'L  Static + linear trend': [], 'A  Skill-state only': [], 'B  + trajectory quality': [], 'C  + forecast only': [], 'D  Full (proposed)': [] };
  const truth = [];
  const byArch = [];
  for (const s of cohort) {
    const series = s.series.slice(0, k);
    const states = buildStates(series, { ...ENGINE_DEFAULTS });
    const state = states[k - 1];
    const dv = domainValues(state);
    models['B0 Static weighted'].push(staticWeighted(dv));
    const staticSeries = states.map((st) => staticWeighted(domainValues(st))).slice(-4);
    const slope = staticSeries.length >= 3 ? theilSen(staticSeries.map((_, i) => i), staticSeries) : 0;
    models['L  Static + linear trend'].push(Math.min(100, Math.max(0, staticWeighted(dv) + slope * H)));
    models['B1 Static fuzzy (prototype)'].push(deckFuzzy({
      coding: state.subjects.coding.mastery,
      dsa: state.subjects.dsa.mastery,
      aptitude: dv.aptitude,
      communication: dv.communication,
    }).score);
    const opt = { fullSeries: false, byRole: false, horizonWeeks: H };
    models['A  Skill-state only'].push(analyze(series, { ...opt, ablate: { trajectory: true, forecast: true } }).readiness.score);
    models['B  + trajectory quality'].push(analyze(series, { ...opt, ablate: { forecast: true } }).readiness.score);
    models['C  + forecast only'].push(analyze(series, { ...opt, ablate: { trajectory: true } }).readiness.projected);
    models['D  Full (proposed)'].push(analyze(series, opt).readiness.projected);
    truth.push(task === 'forecast' ? s.truth[k - 1 + H] : s.truth[k - 1]);
    byArch.push(s.archetype);
  }
  const counter = {};
  const folds = byArch.map((a) => { counter[a] = (counter[a] ?? -1) + 1; return counter[a] % 2; });
  const raw = models;
  const cal = Object.fromEntries(Object.entries(raw).map(([name, p]) => [name, crossCalibrate(p, truth, folds)]));
  return { models: cal, raw, truth, byArch };
}

function table(k, task, H = ENGINE_DEFAULTS.horizonWeeks) {
  const { models, raw, truth, byArch } = predictAll(k, task, H);
  const base = models['B0 Static weighted'];
  const rows = Object.entries(models).map(([name, pred]) => {
    const ci = bootstrapMaeDiff(pred, base, truth);
    return {
      model: name,
      rawBias: mean(raw[name]) - mean(truth),
      MAE: mae(pred, truth),
      RMSE: rmse(pred, truth),
      Spearman: spearman(pred, truth),
      F1: f1AtThreshold(pred, truth, THRESH),
      dMAE_vs_B0: ci,
    };
  });
  const perArch = {};
  for (const a of ARCHETYPES) {
    const idx = byArch.map((x, i) => (x === a ? i : -1)).filter((i) => i >= 0);
    perArch[a] = {
      B0: mae(idx.map((i) => base[i]), idx.map((i) => truth[i])),
      Full: mae(idx.map((i) => models['D  Full (proposed)'][i]), idx.map((i) => truth[i])),
    };
  }
  return { k, task, horizon: H, n: truth.length, prevalence: mean(truth.map((t) => (t >= THRESH ? 1 : 0))), rows, perArch };
}

function sensitivity(k = 8) {
  const rng = mulberry32(99);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const clamp = (x) => Math.min(100, Math.max(0, x));
  const out = [];
  for (const sigma of [2, 5, 10]) {
    const cleanF = [], noisyF = [], cleanB = [], noisyB = [];
    for (const s of cohort) {
      const series = s.series.slice(0, k);
      const res = analyze(series, { fullSeries: false, byRole: false });
      const dv = Object.fromEntries(Object.entries(res.domains).map(([d, v]) => [d, v.mastery]));
      const noisy = Object.fromEntries(Object.entries(dv).map(([d, v]) => [d, clamp(v + sigma * gauss())]));
      const tq = res.stages.trajectoryQuality;
      const mom = res.trajectory.descriptors.momentum;
      cleanF.push(readinessFrom(dv, tq, mom, ENGINE_DEFAULTS).projected);
      noisyF.push(readinessFrom(noisy, tq, mom, ENGINE_DEFAULTS).projected);
      cleanB.push(staticWeighted(dv));
      noisyB.push(staticWeighted(noisy));
    }
    out.push({
      sigma,
      fuzzyMeanAbsChange: mean(cleanF.map((c, i) => Math.abs(c - noisyF[i]))),
      fuzzyRankCorr: spearman(cleanF, noisyF),
      staticMeanAbsChange: mean(cleanB.map((c, i) => Math.abs(c - noisyB[i]))),
      staticRankCorr: spearman(cleanB, noisyB),
    });
  }
  return out;
}

function patternRecovery(k = 8) {
  const target = { steady: 'steady_growth', accelerating: 'steady_growth', surge: 'last_minute_surge', hopper: 'skill_hopping', unbalanced: 'unbalanced_readiness', stagnant: 'stagnation_decline', declining: 'stagnation_decline' };
  const out = {};
  for (const a of ARCHETYPES) {
    const group = cohort.filter((s) => s.archetype === a);
    const res = group.map((s) => analyze(s.series.slice(0, k), { fullSeries: false, byRole: false }).trajectory);
    const own = res.map((r) => r.patterns[target[a]]);
    const wrong = res.map((r) => Math.max(...Object.entries(r.patterns).filter(([key]) => key !== target[a]).map(([, v]) => v)));
    out[a] = {
      expectedPattern: target[a],
      detectedAtLeast0_4: mean(own.map((v) => (v >= 0.4 ? 1 : 0))),
      meanDegree: mean(own),
      dominantIsExpected: mean(res.map((r) => (r.patternClass === target[a] ? 1 : 0))),
    };
  }
  return out;
}

function hoppingDetectors(k = 8) {
  const rows = cohort.map((s) => {
    const r = analyze(s.series.slice(0, k), { fullSeries: false, byRole: false }).trajectory.descriptors;
    return { arch: s.archetype, orphan: r.hopping, switchRate: r.switchRate, entropy: r.practiceEntropy, diversity: r.topicDiversity };
  });
  const out = {};
  for (const [name, key] of [['Linkograph orphan ratio', 'orphan'], ['Topic-switching frequency', 'switchRate'], ['Practice entropy', 'entropy'], ['Topic diversity (4 wk)', 'diversity']]) {
    const pos = rows.filter((r) => r.arch === 'hopper').map((r) => r[key]);
    const vsAll = rows.filter((r) => r.arch !== 'hopper').map((r) => r[key]);
    const vsSteady = rows.filter((r) => r.arch === 'steady').map((r) => r[key]);
    const a1 = auc(pos, vsAll);
    const a2 = auc(pos, vsSteady);
    // direction-adjusted: a detector that is LOW for hoppers is still informative
    out[name] = { direction: a1 >= 0.5 ? 'higher = hopping' : 'lower = hopping', aucVsAll: Math.max(a1, 1 - a1), aucVsSteady: Math.max(a2, 1 - a2) };
  }
  return out;
}

const results = {
  setup: { seed: SEED, studentsPerArchetype: PER_ARCH, archetypes: ARCHETYPES, horizonWeeks: H, readyThreshold: THRESH, note: 'SIMULATED data - validates the protocol, not real-world accuracy.' },
  forecast_week8: table(8, 'forecast', 4),
  forecast_week8_h2: table(8, 'forecast', 2),
  forecast_week6_h6: table(6, 'forecast', 6),
  forecast_week4: table(4, 'forecast', 4),
  current_week8: table(8, 'current'),
  hoppingDetectors: hoppingDetectors(8),
  patternRecovery: patternRecovery(8),
  sensitivity: sensitivity(8),
};
fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));

const f = (x, d = 2) => x.toFixed(d);
for (const key of ['forecast_week8', 'forecast_week8_h2', 'forecast_week6_h6', 'forecast_week4', 'current_week8']) {
  const t = results[key];
  console.log(`\n### ${t.task} task, observed ${t.k} weeks, horizon ${t.horizon ?? '-'} wk (n=${t.n}, prevalence of "ready" = ${f(t.prevalence)})`);
  console.log('| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of t.rows) {
    const d = r.dMAE_vs_B0;
    console.log(`| ${r.model} | ${f(r.rawBias, 1)} | ${f(r.MAE)} | ${f(r.RMSE)} | ${f(r.Spearman, 3)} | ${f(r.F1, 3)} | ${f(d.mean)} [${f(d.lo)}, ${f(d.hi)}] |`);
  }
  if (key === 'forecast_week8') {
    console.log('\nPer-archetype MAE (B0 → Full):');
    for (const [a, v] of Object.entries(t.perArch)) console.log(`  ${a.padEnd(13)} ${f(v.B0)} → ${f(v.Full)}`);
  }
}
console.log('\n### Hopping detectors: AUC for identifying simulated topic hoppers (0.5 = chance)');
console.log('| Detector | direction | AUC vs all others | AUC vs steady learners |');
console.log('|---|---|---|---|');
for (const [n, v] of Object.entries(results.hoppingDetectors)) console.log(`| ${n} | ${v.direction} | ${f(v.aucVsAll, 3)} | ${f(v.aucVsSteady, 3)} |`);
console.log('\n### Pattern recovery (week 8, simulated archetypes)');
console.log('| Archetype | Expected pattern | degree ≥ 0.4 | mean degree | dominant = expected |');
console.log('|---|---|---|---|---|');
for (const [a, v] of Object.entries(results.patternRecovery)) console.log(`| ${a} | ${v.expectedPattern} | ${f(v.detectedAtLeast0_4 * 100, 0)}% | ${f(v.meanDegree)} | ${f(v.dominantIsExpected * 100, 0)}% |`);
console.log('\n### Input-noise sensitivity (week 8, forecast output)');
console.log('| σ (points) | Fuzzy mean |Δ| | Fuzzy ρ | Static mean |Δ| | Static ρ |');
console.log('|---|---|---|---|---|');
for (const s of results.sensitivity) console.log(`| ${s.sigma} | ${f(s.fuzzyMeanAbsChange)} | ${f(s.fuzzyRankCorr, 3)} | ${f(s.staticMeanAbsChange)} | ${f(s.staticRankCorr, 3)} |`);
