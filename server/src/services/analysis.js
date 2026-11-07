/** Glue between the database and the pure engine. */
import { analyze } from '../engine/analyze.js';
import { applyCalibration } from '../engine/calibration.js';
import { Attempt, PracticalLog, Setting, Snapshot } from '../models/index.js';
import { buildSeries, isoDate } from './weekly.js';

export async function getCalibration() {
  const s = await Setting.findOne({ key: 'calibration' }).lean();
  return s?.value ?? null;
}

export function horizonFor(user, now = new Date()) {
  if (!user.placementDate) return 4;
  const weeks = Math.ceil((new Date(user.placementDate) - now) / (7 * 86_400_000));
  return Math.min(16, Math.max(1, weeks));
}

export function applyCal(result, cal) {
  if (!cal || result.empty) return result;
  const r = result.readiness;
  const c = (x) => +applyCalibration(x, cal).toFixed(2);
  result.readiness = { ...r, raw: { score: r.score, projected: r.projected }, score: c(r.score), sensitivityLow: c(r.sensitivityLow), sensitivityHigh: c(r.sensitivityHigh), projected: c(r.projected), projectedSensitivityLow: c(r.projectedSensitivityLow), projectedSensitivityHigh: c(r.projectedSensitivityHigh) };
  result.roles = Object.fromEntries(Object.entries(result.roles ?? {}).map(([k, v]) => [k, { ...v, score: c(v.score), projected: c(v.projected) }]));
  result.trajectory.series = result.trajectory.series.map((p) => ({ ...p, readiness: c(p.readiness), projected: c(p.projected) }));
  result.meta.calibrated = true;
  return result;
}

export async function analyzeStudent(user, { persist = true, now = new Date() } = {}) {
  const [attempts, manual, cal] = await Promise.all([
    Attempt.find({ student: user._id }).select('subject difficulty correct createdAt').lean(),
    PracticalLog.find({ student: user._id }).lean(),
    getCalibration(),
  ]);
  const series = buildSeries({ attempts, manual, now });
  const result = analyze(series, { targetRole: user.targetRole, horizonWeeks: horizonFor(user, now) });
  if (result.empty) return result;
  if (persist) {
    const d = result.trajectory.descriptors;
    await Snapshot.findOneAndUpdate(
      { student: user._id, day: isoDate(now) },
      {
        score: result.readiness.score, // raw (uncalibrated) score is what calibration is fitted on
        projected: result.readiness.projected,
        evidenceSufficiency: result.meta.evidenceSufficiency,
        engineVersion: result.meta.engineVersion,
        configHash: result.meta.configHash,
        skillState: result.stages.skillState,
        trajectoryQuality: result.stages.trajectoryQuality,
        momentum: d.momentum, consistency: d.consistency, balance: d.balance, surge: d.surge, hopping: d.hopping,
        patternClass: result.trajectory.patternClass,
        weeks: result.meta.weeks,
        domains: Object.fromEntries(Object.entries(result.domains).map(([k, v]) => [k, v.mastery])),
        roles: Object.fromEntries(Object.entries(result.roles ?? {}).map(([k, v]) => [k, v.score])),
        patterns: result.trajectory.patterns,
      },
      { upsert: true, new: true },
    );
  }
  return applyCal(result, cal);
}
