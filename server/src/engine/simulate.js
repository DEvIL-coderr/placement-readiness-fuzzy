/**
 * Synthetic student simulator.
 *
 * IMPORTANT: this is a *simulation* used to (a) demo the dashboard and (b) exercise the
 * evaluation protocol (baselines, ablations, sensitivity) before real cohort data is
 * collected. Results on simulated data must never be presented as empirical evidence
 * of real-world accuracy.
 *
 * Latent model: each student has a latent ability per subject that grows with
 * practice (diminishing returns) and decays without practice. Quiz outcomes are
 * noisy functions of latent ability and question difficulty. Ground-truth readiness
 * is a fixed weighted sum of latent domain abilities.
 */
import { DOMAINS, QUESTION_DOMAINS, STATIC_WEIGHTS, SUBJECTS, DIFFICULTY_WEIGHT } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function poisson(rng, lambda) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(rng)));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

export const ARCHETYPES = ['steady', 'accelerating', 'surge', 'hopper', 'unbalanced', 'stagnant', 'declining'];
const DIFFICULTIES = [['easy', 0.4], ['medium', 0.4], ['hard', 0.2]];
const THRESHOLD = { easy: 25, medium: 50, hard: 75 };
const BASE = { dsa: 40, core: 45, aptitude: 45, communication: 50 };
const PRACTICAL_PROB = { steady: 0.7, accelerating: 0.6, surge: 0.3, hopper: 0.4, unbalanced: 0.6, stagnant: 0.1, declining: 0.2 };

function pickDifficulty(rng) {
  let r = rng();
  for (const [d, p] of DIFFICULTIES) { if ((r -= p) < 0) return d; }
  return 'medium';
}

/** Expected attempts per subject for week w. */
function plan(archetype, w, ctx, rng) {
  const q = Object.fromEntries(SUBJECTS.map((s) => [s.slug, 0]));
  const spread = (budget, slugs) => slugs.forEach((s) => { q[s] = budget / slugs.length; });
  const all = SUBJECTS.map((s) => s.slug);
  switch (archetype) {
    case 'steady': spread(ctx.budget, all); break;
    case 'accelerating': spread(20 + (ctx.budget - 20) * Math.min(1, w / 8), all); break;
    case 'surge': spread(w < ctx.surgeStart ? 6 : ctx.budget * 1.4, all); break;
    case 'hopper': {
      let s;
      do { s = all[Math.floor(rng() * all.length)]; } while (s === ctx.lastHop);
      ctx.lastHop = s;
      q[s] = ctx.budget;
      break;
    }
    case 'unbalanced':
      spread(ctx.budget, SUBJECTS.filter((s) => s.domain === 'dsa' || s.domain === 'core').map((s) => s.slug));
      break;
    case 'stagnant': spread(8, all); break;
    case 'declining': spread(ctx.budget * Math.pow(0.65, w), all); break;
    default: spread(ctx.budget, all);
  }
  return q;
}

/**
 * Simulate `weeks` weeks for one student.
 * @returns {{series:Array, attempts:Array, truth:number[], archetype:string}} truth[w] = true readiness after week w
 */
export function simulateStudent(archetype, rng, { weeks = 12, startDate = '2026-01-05' } = {}) {
  const lr = Math.exp(0.25 * gauss(rng));
  const ctx = { budget: clamp(60 + 12 * gauss(rng), 25, 100), surgeStart: 4 + Math.floor(rng() * 3), lastHop: null };
  const ability = {};
  for (const s of SUBJECTS) ability[s.slug] = clamp(BASE[s.domain] + 12 * gauss(rng), 10, 75);
  let practical = clamp(40 + 15 * gauss(rng), 5, 80);

  const series = [];
  const attempts = [];
  const truth = [];
  const t0 = Date.parse(startDate);

  for (let w = 0; w < weeks; w++) {
    const q = plan(archetype, w, ctx, rng);
    const subjects = {};
    for (const s of SUBJECTS) {
      const n = poisson(rng, q[s.slug]);
      if (n > 0) {
        const cell = { attempted: n, wattempted: 0, wcorrect: 0 };
        for (let i = 0; i < n; i++) {
          const d = pickDifficulty(rng);
          const p = 0.25 + 0.75 * sigmoid((ability[s.slug] - THRESHOLD[d]) / 15);
          const wt = DIFFICULTY_WEIGHT[d];
          const correct = rng() < p;
          cell.wattempted += wt;
          if (correct) cell.wcorrect += wt;
          attempts.push({ subject: s.slug, difficulty: d, correct, week: w });
        }
        subjects[s.slug] = cell;
      }
      // learning / forgetting happens after the week's quiz (quiz measures start-of-week ability)
      const u = Math.min(1.5, q[s.slug] / 10);
      if (q[s.slug] < 3) ability[s.slug] *= 0.96;
      else ability[s.slug] = clamp(ability[s.slug] + 10 * lr * u * (1 - ability[s.slug] / 100), 0, 100);
    }
    if (rng() < PRACTICAL_PROB[archetype]) practical = clamp(practical + 3 * lr, 0, 100);

    const entry = { week: w, date: new Date(t0 + w * 7 * 86_400_000).toISOString().slice(0, 10), subjects, practical: null };
    if (rng() < 0.6) entry.practical = { projects: clamp(practical + 8 * gauss(rng), 0, 100), mock: clamp(practical + 10 * gauss(rng), 0, 100) };
    series.push(entry);

    const dom = {};
    for (const d of QUESTION_DOMAINS) {
      const subs = SUBJECTS.filter((s) => s.domain === d);
      dom[d] = subs.reduce((sum, s) => sum + ability[s.slug], 0) / subs.length;
    }
    dom.practical = practical;
    truth.push(DOMAINS.reduce((sum, d) => sum + STATIC_WEIGHTS[d] * dom[d], 0));
  }
  return { series, attempts, truth, archetype };
}

export function simulateCohort({ perArchetype = 100, seed = 42, weeks = 12 } = {}) {
  const rng = mulberry32(seed);
  const out = [];
  for (const a of ARCHETYPES) for (let i = 0; i < perArchetype; i++) out.push(simulateStudent(a, rng, { weeks }));
  return out;
}
