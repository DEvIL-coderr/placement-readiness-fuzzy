/**
 * Trajectory-aware fuzzy placement-readiness analysis (the "FTRA" pipeline).
 *
 * Input: a dense weekly series (gaps filled with empty weeks), each item
 *   { week: 0-based index, date: 'YYYY-MM-DD',
 *     subjects: { [slug]: { attempted, wattempted, wcorrect } },   // difficulty-weighted
 *     practical?: { projects?: 0..100, mock?: 0..100 } }
 *
 * Pipeline:
 *   1. Evidence-weighted mastery per subject/domain   (decay + shrinkage + chance correction)
 *   2. Hierarchical Mamdani inference: TS, NS -> Skill State SS (per week)
 *   3. Trajectory descriptors: momentum, consistency, balance, surge, hopping
 *      (hopping comes from the fuzzy preparation linkograph)
 *   4. Trajectory Quality TQ and final Readiness R, plus a forecast at the placement horizon
 *   5. Evidence-adjusted uncertainty band, fuzzy pattern memberships, ranked recommendations
 */
import {
  DOMAIN_LABELS,
  ENGINE_DEFAULTS,
  ENGINE_VERSION,
  QUESTION_DOMAINS,
  ROLE_PROFILES,
  SUBJECTS,
  relatedness,
} from './config.js';
import { clamp, trapmf } from './fuzzy.js';
import { BALANCE_LOW, HOP_HIGH, LEVELS, MOMENTUM_SETS, SURGE_HIGH, SYSTEMS, configFingerprint, rescale } from './systems.js';

const { TS, NS, SS, TQ, READINESS } = SYSTEMS;
const CONFIG_HASH = configFingerprint({ ...ENGINE_DEFAULTS });

// ---------- small numeric helpers ----------
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const std = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Robust slope (median of pairwise slopes). */
export function theilSen(xs, ys) {
  const slopes = [];
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
    }
  }
  return median(slopes);
}

// ---------- 1. evidence-weighted mastery ----------
export function masteryOf(wc, wa, o) {
  const corrected = Math.max(0, (wc - o.chance * wa) / (1 - o.chance));
  return (100 * (corrected + (o.priorMean / 100) * o.priorWeight)) / (wa + o.priorWeight);
}

/** Role weights normalised per domain (mean 1) so the neutral/general role equals plain pooling. */
function normalisedRoleWeights(o) {
  const rw = o.roleWeights ?? {};
  const out = {};
  for (const d of QUESTION_DOMAINS) {
    const subs = SUBJECTS.filter((s) => s.domain === d);
    const m = mean(subs.map((s) => rw[s.slug] ?? 1)) || 1;
    for (const s of subs) out[s.slug] = (rw[s.slug] ?? 1) / m;
  }
  return out;
}

export function validateSeries(series) {
  series.forEach((wk, i) => {
    for (const [slug, v] of Object.entries(wk.subjects ?? {})) {
      const ok = [v.attempted, v.wattempted, v.wcorrect].every((x) => Number.isFinite(x) && x >= 0) && v.wcorrect <= v.wattempted + 1e-9;
      if (!ok) throw new RangeError(`Invalid weekly record (week ${i}, subject ${slug})`);
    }
    for (const k of ['projects', 'mock']) {
      const x = wk.practical?.[k];
      if (x !== undefined && x !== null && !(Number.isFinite(x) && x >= 0 && x <= 100)) throw new RangeError(`Invalid ${k} score in week ${i}`);
    }
  });
}

export function buildStates(series, o) {
  const lambda = Math.pow(0.5, 1 / o.halfLifeWeeks);
  const acc = Object.fromEntries(SUBJECTS.map((s) => [s.slug, { wa: 0, wc: 0 }]));
  const rw = normalisedRoleWeights(o);
  let lastProjects = null;
  let lastMock = null;
  let lastPracticalIdx = -1;
  return series.map((wk, idx) => {
    if (idx > 0) for (const a of Object.values(acc)) { a.wa *= lambda; a.wc *= lambda; }
    for (const [slug, v] of Object.entries(wk.subjects ?? {})) {
      if (!acc[slug]) continue;
      acc[slug].wa += v.wattempted ?? 0;
      acc[slug].wc += v.wcorrect ?? 0;
    }
    if (wk.practical) {
      if (Number.isFinite(wk.practical.projects)) { lastProjects = wk.practical.projects; lastPracticalIdx = idx; }
      if (Number.isFinite(wk.practical.mock)) { lastMock = wk.practical.mock; lastPracticalIdx = idx; }
    }
    const subjects = {};
    for (const s of SUBJECTS) {
      const a = acc[s.slug];
      subjects[s.slug] = { mastery: masteryOf(a.wc, a.wa, o), evidence: a.wa };
    }
    const domains = {};
    for (const d of QUESTION_DOMAINS) {
      let wa = 0;
      let wc = 0;
      for (const s of SUBJECTS) if (s.domain === d) { wa += rw[s.slug] * acc[s.slug].wa; wc += rw[s.slug] * acc[s.slug].wc; }
      domains[d] = { mastery: masteryOf(wc, wa, o), evidence: wa };
    }
    const known = [lastProjects, lastMock].filter((v) => v !== null);
    // old project/mock evidence fades toward the prior instead of representing current ability forever
    const fresh = known.length ? Math.pow(0.5, (idx - lastPracticalIdx) / o.practicalHalfLifeWeeks) : 0;
    domains.practical = {
      mastery: known.length ? o.priorMean + (mean(known) - o.priorMean) * fresh : o.priorMean,
      evidence: 30 * fresh,
    };
    return { week: wk.week, date: wk.date, subjects, domains };
  });
}

export const domainValues = (state) =>
  Object.fromEntries(Object.entries(state.domains).map(([d, v]) => [d, v.mastery]));

// ---------- 2. skill state ----------
export function skillState(d) {
  const ts = TS.infer({ dsa: d.dsa, core: d.core });
  const ns = NS.infer({ aptitude: d.aptitude, communication: d.communication });
  const ss = SS.infer({ technical: ts.crisp, nontechnical: ns.crisp, practical: d.practical });
  return { ts, ns, ss };
}

// ---------- 3. descriptors ----------
export function consistencyOf(attempts, minActive = 15) {
  const n = attempts.length;
  if (n < 3) return 50;
  const activeFrac = attempts.filter((a) => a >= minActive).length / n;
  const m = mean(attempts);
  const cv = m > 0 ? std(attempts) / m : 2;
  const regularity = 1 - Math.min(1, cv / 1.5);
  return 100 * (0.6 * activeFrac + 0.4 * regularity);
}

export function surgeOf(attempts) {
  const n = attempts.length;
  if (n < 4) return 0;
  const total = attempts.reduce((s, x) => s + x, 0);
  if (!total) return 0;
  const last2 = attempts[n - 1] + attempts[n - 2];
  const ratio = last2 / total / (2 / n);
  return 100 * clamp((ratio - 1) / 1.5, 0, 1);
}

/**
 * Balance of preparation across competency domains: penalises both a wide spread of
 * mastery among assessed domains and domains that have not been assessed at all.
 */
export function balanceOf(state, o) {
  const assessedQ = QUESTION_DOMAINS.filter((d) => state.domains[d].evidence >= o.minDomainEvidence);
  const values = assessedQ.map((d) => state.domains[d].mastery);
  if (state.domains.practical.evidence > 0) values.push(state.domains.practical.mastery);
  const missing = QUESTION_DOMAINS.length - assessedQ.length;
  return clamp(100 - 2.2 * std(values) - 25 * missing, 0, 100);
}

/**
 * Fuzzy preparation linkograph (adapted from fuzzy linkography, Smith et al. 2025).
 * Events are (week, subject) practice moves. The link strength between two
 * events is the fuzzy AND (min) of topical relatedness and temporal proximity.
 * Events with no sufficiently strong link are "orphans" (isolated topic hops).
 */
export function linkograph(series, o) {
  const events = [];
  series.forEach((wk) => {
    for (const [slug, v] of Object.entries(wk.subjects ?? {})) {
      if ((v.attempted ?? 0) >= o.minEventAttempts) events.push({ week: wk.week, slug, attempts: v.attempted });
    }
  });
  const prox = (gap) => (gap <= 1 ? 1 : gap >= 4 ? 0 : (4 - gap) / 3);
  const links = [];
  const maxLink = new Array(events.length).fill(0);
  const matrix = {};
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const strength = Math.min(relatedness(events[i].slug, events[j].slug), prox(events[j].week - events[i].week));
      if (strength <= 0) continue;
      if (strength > maxLink[i]) maxLink[i] = strength;
      if (strength > maxLink[j]) maxLink[j] = strength;
      links.push({ from: i, to: j, strength });
      const key = [events[i].slug, events[j].slug].sort().join('|');
      matrix[key] = (matrix[key] ?? 0) + strength;
    }
  }
  const orphans = maxLink.filter((m) => m < o.orphanThreshold).length;
  const orphanRatio = events.length >= 4 ? orphans / events.length : 0;
  return {
    events,
    orphanRatio,
    density: events.length ? mean(maxLink) : 0,
    topLinks: links.sort((a, b) => b.strength - a.strength).slice(0, 60),
    subjectMatrix: matrix,
  };
}

function residualStd(ys) {
  if (ys.length < 3) return 0;
  const xs = ys.map((_, i) => i);
  const b = theilSen(xs, ys);
  const a = median(ys.map((y, i) => y - b * i));
  return std(ys.map((y, i) => y - (a + b * i)));
}

/** Simple alternatives to the linkograph, kept for the validation study (see research/evaluate.js). */
export function switchingMeasures(series) {
  const dominant = series
    .map((wk) => Object.entries(wk.subjects ?? {}).sort((a, b) => b[1].attempted - a[1].attempted)[0])
    .filter((e) => e && e[1].attempted > 0)
    .map((e) => e[0]);
  let switches = 0;
  for (let i = 1; i < dominant.length; i++) if (dominant[i] !== dominant[i - 1]) switches++;
  const switchRate = dominant.length > 1 ? (100 * switches) / (dominant.length - 1) : 0;
  const totals = {};
  let all = 0;
  for (const wk of series) for (const [slug, v] of Object.entries(wk.subjects ?? {})) { totals[slug] = (totals[slug] ?? 0) + v.attempted; all += v.attempted; }
  let H = 0;
  for (const t of Object.values(totals)) { const p = t / all; if (p > 0) H -= p * Math.log(p); }
  const practiceEntropy = all ? (100 * H) / Math.log(SUBJECTS.length) : 0;
  const recent = new Set();
  for (const wk of series.slice(-4)) for (const [slug, v] of Object.entries(wk.subjects ?? {})) if (v.attempted > 0) recent.add(slug);
  return { switchRate, practiceEntropy, topicDiversity: (100 * recent.size) / SUBJECTS.length };
}

export function descriptorsAt(series, ssSeries, state, w, o) {
  const prefix = series.slice(0, w + 1);
  const attempts = prefix.map((wk) => Object.values(wk.subjects ?? {}).reduce((s, v) => s + (v.attempted ?? 0), 0));
  const window = ssSeries.slice(Math.max(0, w + 1 - o.momentumWindow), w + 1);
  const momentum = window.length >= 3
    ? clamp(theilSen(window.map((_, i) => i), window), -10, 10)
    : 0;
  const link = linkograph(prefix, o);
  const recentSS = ssSeries.slice(Math.max(0, w + 1 - o.momentumWindow), w + 1);
  const accel = ssSeries.slice(0, w + 1).length >= 6
    ? (() => { const a = ssSeries.slice(w - 2, w + 1); const b = ssSeries.slice(w - 5, w - 2); return theilSen([0, 1, 2], a) - theilSen([0, 1, 2], b); })()
    : 0;
  return {
    momentum,
    practiceRegularity: consistencyOf(attempts, o.minWeeklyAttempts),
    scoreVolatility: residualStd(recentSS),
    acceleration: clamp(accel, -10, 10),
    ...switchingMeasures(prefix),
    consistency: consistencyOf(attempts, o.minWeeklyAttempts),
    balance: balanceOf(state, o),
    surge: surgeOf(attempts),
    hopping: 100 * link.orphanRatio,
    attempts,
    link,
  };
}

export function patternMemberships(d) {
  const m = {
    declining: MOMENTUM_SETS.declining(d.momentum),
    flat: MOMENTUM_SETS.flat(d.momentum),
    rising: MOMENTUM_SETS.rising(d.momentum),
  };
  const highCons = LEVELS.high(d.consistency);
  const surgeHigh = SURGE_HIGH(d.surge);
  const hopHigh = HOP_HIGH(d.hopping);
  return {
    steady_growth: Math.min(m.rising, highCons, 1 - surgeHigh),
    last_minute_surge: Math.min(surgeHigh, 1 - highCons),
    skill_hopping: hopHigh,
    unbalanced_readiness: BALANCE_LOW(d.balance),
    stagnation_decline: Math.max(m.declining, Math.min(m.flat, 1 - highCons)),
  };
}

export const PATTERN_LABELS = {
  steady_growth: 'Steady growth',
  last_minute_surge: 'Last-minute surge',
  skill_hopping: 'Skill hopping',
  unbalanced_readiness: 'Unbalanced readiness',
  stagnation_decline: 'Stagnation / decline',
};

// ---------- 4. readiness ----------
export function readinessFrom(domainVals, tq, momentum, o) {
  const { ss } = skillState(domainVals);
  const now = rescale(READINESS.infer({ skill_state: ss.crisp, trajectory: tq }).crisp);
  const ssProj = clamp(ss.crisp + o.damping * momentum * o.horizonWeeks, 0, 100);
  const projected = rescale(READINESS.infer({ skill_state: ssProj, trajectory: tq }).crisp);
  return { now, projected, ss: ss.crisp };
}

export const readinessLabel = (r) =>
  r < 35 ? 'Not ready' : r < 55 ? 'Developing' : r < 75 ? 'Almost ready' : 'Placement ready';

const ADVICE = {
  steady_growth: 'Your preparation is improving consistently. Keep the weekly routine and increase the share of hard questions.',
  last_minute_surge: 'Most of your practice is bunched into the latest weeks. Spread it out: a fixed weekly quota beats occasional bursts.',
  skill_hopping: 'You are switching between unrelated topics without revisiting them. Pair related subjects in the same week (e.g. DSA with Programming).',
  unbalanced_readiness: 'Your skills are lopsided. Dedicate the next two weeks to your weakest domain before adding more of your strongest.',
  stagnation_decline: 'Your scores are flat or falling. Reduce the number of topics, re-attempt questions you got wrong, and add a mock interview.',
};

// ---------- main entry ----------
export function analyze(series, options = {}) {
  const o = { ...ENGINE_DEFAULTS, ...options };
  const ablate = options.ablate ?? {};
  if (!series?.length) return { empty: true, message: 'No activity recorded yet. Attempt a quiz to start your trajectory.' };
  validateSeries(series);
  o.roleWeights = (ROLE_PROFILES[o.targetRole] ?? ROLE_PROFILES.general).weights;

  const states = buildStates(series, o);
  const n = series.length;
  const last = states[n - 1];
  const ssSeries = states.map((st) => skillState(domainValues(st)).ss.crisp);

  const seriesOut = [];
  let finalDesc = null;
  let finalTq = null;
  for (let w = 0; w < n; w++) {
    if (!o.fullSeries && w < n - 1) continue;
    const dv = domainValues(states[w]);
    const desc = descriptorsAt(series, ssSeries, states[w], w, o);
    const tq = ablate.trajectory ? 50 : TQ.infer({ momentum: desc.momentum, consistency: desc.consistency, balance: desc.balance }).crisp;
    const r = readinessFrom(dv, tq, ablate.forecast ? 0 : desc.momentum, o);
    seriesOut.push({
      week: series[w].week,
      date: series[w].date,
      skillState: ssSeries[w],
      readiness: r.now,
      projected: r.projected,
      momentum: desc.momentum,
      attempts: desc.attempts[w],
    });
    if (w === n - 1) { finalDesc = desc; finalTq = tq; }
  }

  const dv = domainValues(last);
  const momentum = finalDesc.momentum;
  const core = readinessFrom(dv, finalTq, ablate.forecast ? 0 : momentum, o);

  // Sensitivity band (NOT a statistical confidence interval): inputs shifted by +/-delta, delta shrinking with evidence
  const weeksFactor = Math.min(1, n / 6);
  const evidenceFactor = mean(QUESTION_DOMAINS.map((d) => Math.min(1, last.domains[d].evidence / 30)));
  const confidence = 0.4 * weeksFactor + 0.5 * evidenceFactor + 0.1 * (last.domains.practical.evidence > 0 ? 1 : 0);
  const delta = (1 - confidence) * 12;
  const shift = (sgn) => Object.fromEntries(Object.entries(dv).map(([k, v]) => [k, clamp(v + sgn * delta, 0, 100)]));
  const lo = readinessFrom(shift(-1), finalTq, ablate.forecast ? 0 : momentum, o);
  const hi = readinessFrom(shift(1), finalTq, ablate.forecast ? 0 : momentum, o);

  // stage outputs and explanation
  const { ts, ns, ss } = skillState(dv);
  const tqRes = TQ.infer({ momentum, consistency: finalDesc.consistency, balance: finalDesc.balance });
  const rRes = READINESS.infer({ skill_state: ss.crisp, trajectory: finalTq });
  const topRules = (res, stage) => res.firing
    .filter((f) => f.strength > 0.15)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 2)
    .map((f) => ({ stage, text: f.text, strength: +f.strength.toFixed(3) }));
  const firedRules = [
    ...topRules(ts, 'Technical strength'),
    ...topRules(ns, 'Non-technical strength'),
    ...topRules(ss, 'Skill state'),
    ...topRules(tqRes, 'Trajectory quality'),
    ...topRules(rRes, 'Readiness'),
  ];

  // patterns
  const patterns = patternMemberships(finalDesc);
  const [domKey, domDeg] = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0];
  const patternClass = n < 3 ? 'insufficient_history' : domDeg < 0.3 ? 'mixed' : domKey;

  // subjects & recommendations
  const role = ROLE_PROFILES[o.targetRole] ?? ROLE_PROFILES.general;
  const subjects = SUBJECTS.map((s) => {
    const idxs = states.map((_, i) => i).slice(-4);
    const ys = idxs.map((i) => states[i].subjects[s.slug].mastery);
    const trend = idxs.length >= 3 && last.subjects[s.slug].evidence >= 3 ? clamp(theilSen(idxs, ys), -10, 10) : 0;
    let lastIdx = -1;
    series.forEach((wk, i) => { if ((wk.subjects?.[s.slug]?.attempted ?? 0) > 0) lastIdx = i; });
    return {
      slug: s.slug,
      name: s.name,
      domain: s.domain,
      mastery: last.subjects[s.slug].mastery,
      evidence: last.subjects[s.slug].evidence,
      trend,
      weeksSincePractice: lastIdx >= 0 ? n - 1 - lastIdx : null,
    };
  });
  const gapSet = trapmf(0, 0, 30, 70);
  const recommendations = subjects
    .map((s) => {
      const rw = role.weights[s.slug] ?? 0.7;
      const unassessed = s.evidence < 3;
      const gap = gapSet(s.mastery);
      const decl = MOMENTUM_SETS.declining(s.trend);
      const neglect = s.weeksSincePractice === null ? 1 : clamp((s.weeksSincePractice - 1) / 3, 0, 1);
      const priority = rw * (0.6 * gap + 0.2 * decl + 0.2 * neglect) + (unassessed ? 0.1 * rw : 0);
      const reasons = [];
      if (unassessed) reasons.push('not assessed yet');
      else if (s.mastery < 50) reasons.push(`mastery ${s.mastery.toFixed(0)}% is below the target`);
      if (decl > 0.4) reasons.push('scores are declining');
      if (neglect > 0.5) reasons.push(s.weeksSincePractice === null ? 'never practised' : `not practised for ${s.weeksSincePractice} weeks`);
      if (rw >= 0.9) reasons.push(`highly weighted for ${role.label}`);
      return { slug: s.slug, name: s.name, domain: s.domain, priority: +priority.toFixed(3), mastery: +s.mastery.toFixed(1), reasons };
    })
    .sort((a, b) => b.priority - a.priority);

  const advice = Object.entries(patterns)
    .filter(([, deg]) => deg >= 0.4)
    .sort((a, b) => b[1] - a[1])
    .map(([key, deg]) => {
      let text = ADVICE[key];
      if (key === 'unbalanced_readiness') {
        const sorted = Object.entries(dv).sort((a, b) => a[1] - b[1]);
        text = `${DOMAIN_LABELS[sorted[0][0]]} (${sorted[0][1].toFixed(0)}%) lags far behind ${DOMAIN_LABELS[sorted[sorted.length - 1][0]]} (${sorted[sorted.length - 1][1].toFixed(0)}%). ${ADVICE[key]}`;
      }
      return { pattern: key, label: PATTERN_LABELS[key], degree: +deg.toFixed(2), text };
    });

  const { attempts: _a, link, ...descriptors } = finalDesc;
  // role-specific readiness: the same history scored against every role's competency weights
  const roles = {};
  if (options.byRole !== false) {
    for (const [key, prof] of Object.entries(ROLE_PROFILES)) {
      const r = key === o.targetRole ? { readiness: { score: core.now, projected: core.projected } } : analyze(series, { ...options, targetRole: key, fullSeries: false, byRole: false });
      roles[key] = { label: prof.label, score: +r.readiness.score.toFixed(2), projected: +r.readiness.projected.toFixed(2) };
    }
  }
  return {
    roles,
    meta: { weeks: n, targetRole: o.targetRole, roleLabel: role.label, horizonWeeks: o.horizonWeeks, evidenceSufficiency: +confidence.toFixed(3), sensitivityDelta: +delta.toFixed(2), engineVersion: ENGINE_VERSION, configHash: CONFIG_HASH },
    domains: Object.fromEntries(Object.entries(last.domains).map(([d, v]) => [d, { label: DOMAIN_LABELS[d], mastery: +v.mastery.toFixed(2), evidence: +v.evidence.toFixed(1) }])),
    subjects,
    stages: { technical: +ts.crisp.toFixed(2), nontechnical: +ns.crisp.toFixed(2), skillState: +ss.crisp.toFixed(2), trajectoryQuality: +finalTq.toFixed(2) },
    readiness: {
      score: +core.now.toFixed(2),
      label: readinessLabel(core.now),
      sensitivityLow: +Math.min(lo.now, hi.now, core.now).toFixed(2),
      sensitivityHigh: +Math.max(lo.now, hi.now, core.now).toFixed(2),
      projected: +core.projected.toFixed(2),
      projectedLabel: readinessLabel(core.projected),
      projectedSensitivityLow: +Math.min(lo.projected, hi.projected, core.projected).toFixed(2),
      projectedSensitivityHigh: +Math.max(lo.projected, hi.projected, core.projected).toFixed(2),
    },
    trajectory: {
      series: seriesOut,
      descriptors: Object.fromEntries(Object.entries(descriptors).map(([k, v]) => [k, +v.toFixed(2)])),
      patterns: Object.fromEntries(Object.entries(patterns).map(([k, v]) => [k, +v.toFixed(3)])),
      patternClass,
      patternLabel: PATTERN_LABELS[patternClass] ?? (patternClass === 'insufficient_history' ? 'Not enough history yet' : 'Mixed pattern'),
    },
    linkograph: {
      orphanRatio: +link.orphanRatio.toFixed(3),
      density: +link.density.toFixed(3),
      events: link.events,
      topLinks: link.topLinks,
      subjectMatrix: link.subjectMatrix,
    },
    recommendations: recommendations.filter((r) => r.priority >= 0.05).slice(0, 5),
    advice,
    explanation: firedRules,
  };
}
