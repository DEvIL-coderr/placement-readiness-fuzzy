/**
 * Linear calibration of the readiness score against expert (faculty) ratings.
 * The raw fuzzy score is an ordinal indicator until it is calibrated on real data.
 */
const clamp = (x) => Math.min(100, Math.max(0, x));

/** @param {Array<{score:number, rating:number}>} pairs */
export function fitLinear(pairs) {
  const n = pairs.length;
  if (n < 5) return null;
  const mx = pairs.reduce((s, p) => s + p.score, 0) / n;
  const my = pairs.reduce((s, p) => s + p.rating, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pairs) { num += (p.score - mx) * (p.rating - my); den += (p.score - mx) ** 2; }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  const mae = pairs.reduce((s, p) => s + Math.abs(clamp(intercept + slope * p.score) - p.rating), 0) / n;
  return { intercept, slope, n, mae };
}

export const applyCalibration = (x, cal) => (cal ? clamp(cal.intercept + cal.slope * x) : x);
