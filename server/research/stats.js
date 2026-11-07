/** Evaluation statistics (no dependencies). */
import { mulberry32 } from '../src/engine/simulate.js';

export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
export const mae = (p, t) => mean(p.map((x, i) => Math.abs(x - t[i])));
export const rmse = (p, t) => Math.sqrt(mean(p.map((x, i) => (x - t[i]) ** 2)));

function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function pearson(x, y) {
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

export const spearman = (x, y) => pearson(ranks(x), ranks(y));

export function f1AtThreshold(pred, truth, thr = 60) {
  let tp = 0, fp = 0, fn = 0;
  pred.forEach((p, i) => {
    const pp = p >= thr;
    const tt = truth[i] >= thr;
    if (pp && tt) tp++;
    else if (pp && !tt) fp++;
    else if (!pp && tt) fn++;
  });
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
}

/** Paired bootstrap CI for mean(|errA|) - mean(|errB|); negative => A better. */
export function bootstrapMaeDiff(predA, predB, truth, { iters = 2000, seed = 7 } = {}) {
  const rng = mulberry32(seed);
  const n = truth.length;
  const d = truth.map((t, i) => Math.abs(predA[i] - t) - Math.abs(predB[i] - t));
  const diffs = [];
  for (let b = 0; b < iters; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += d[Math.floor(rng() * n)];
    diffs.push(s / n);
  }
  diffs.sort((x, y) => x - y);
  return { mean: mean(d), lo: diffs[Math.floor(0.025 * iters)], hi: diffs[Math.floor(0.975 * iters)] };
}
