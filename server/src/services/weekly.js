/**
 * Turns raw quiz attempts + manual practical logs into the dense weekly series
 * consumed by the fuzzy engine. Pure functions (no DB access) so they are unit-tested.
 * Weeks start on Monday (UTC).
 */
import { DIFFICULTY_WEIGHT } from '../engine/config.js';

const DAY = 86_400_000;

export function weekStart(input) {
  const d = new Date(input);
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(utc).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(utc - dow * DAY);
}

export const isoDate = (d) => d.toISOString().slice(0, 10);

/**
 * @param {object} p
 * @param {Array<{subject:string, correct:boolean, difficulty:'easy'|'medium'|'hard', createdAt:Date|string}>} p.attempts
 * @param {Array<{weekStart:string, projects?:number, mock?:number}>} [p.manual]
 * @param {Date} [p.now]
 */
export function buildSeries({ attempts = [], manual = [], now = new Date() }) {
  const stamps = [
    ...attempts.map((a) => weekStart(a.createdAt).getTime()),
    ...manual.map((m) => weekStart(m.weekStart).getTime()),
  ];
  if (!stamps.length) return [];
  const first = Math.min(...stamps);
  const lastWeek = Math.max(weekStart(now).getTime(), ...stamps);
  const n = Math.round((lastWeek - first) / (7 * DAY)) + 1;

  const series = Array.from({ length: n }, (_, i) => ({
    week: i,
    date: isoDate(new Date(first + i * 7 * DAY)),
    subjects: {},
    practical: null,
  }));

  for (const a of attempts) {
    const idx = Math.round((weekStart(a.createdAt).getTime() - first) / (7 * DAY));
    const w = DIFFICULTY_WEIGHT[a.difficulty] ?? DIFFICULTY_WEIGHT.medium;
    const cell = (series[idx].subjects[a.subject] ??= { attempted: 0, wattempted: 0, wcorrect: 0 });
    cell.attempted += 1;
    cell.wattempted += w;
    if (a.correct) cell.wcorrect += w;
  }

  const sortedManual = [...manual].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
  for (const m of sortedManual) {
    const idx = Math.round((weekStart(m.weekStart).getTime() - first) / (7 * DAY));
    series[idx].practical = { projects: m.projects, mock: m.mock };
  }
  return series;
}
