/** Pure helpers for the blind faculty assessment (no database, no dependencies, unit-tested). */
import { DOMAINS, SUBJECTS } from '../engine/config.js';

export const PATTERNS = ['steady_growth', 'last_minute_surge', 'skill_hopping', 'unbalanced_readiness', 'stagnation_decline'];
const SLUGS = SUBJECTS.map((s) => s.slug);
const inRange = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;

/** @returns {{ok:true,value:object}|{ok:false,errors:string[]}} */
export function validateAssessment(body) {
  const errors = [];
  const b = body && typeof body === 'object' ? body : {};
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,29}$/.test(String(b.round ?? ''))) errors.push('round must be 1-30 letters, digits, space, - or _');
  if (!/^[0-9a-fA-F]{24}$/.test(String(b.studentId ?? ''))) errors.push('studentId is invalid');
  if (!inRange(b.overall)) errors.push('overall must be a number from 0 to 100');

  const domains = {};
  for (const [k, v] of Object.entries(b.domains ?? {})) {
    if (!DOMAINS.includes(k)) errors.push(`unknown domain "${k}"`);
    else if (v === null || v === '' || v === undefined) continue;
    else if (!inRange(v)) errors.push(`domain ${k} must be 0-100`);
    else domains[k] = v;
  }

  let pattern = null;
  if (b.pattern !== undefined && b.pattern !== null && b.pattern !== '') {
    if (!PATTERNS.includes(b.pattern)) errors.push('unknown pattern');
    else pattern = b.pattern;
  }

  const priorities = Array.isArray(b.priorities) ? b.priorities : [];
  if (priorities.length > 3) errors.push('at most 3 priority subjects');
  if (priorities.some((p) => !SLUGS.includes(p))) errors.push('unknown priority subject');
  if (new Set(priorities).size !== priorities.length) errors.push('priority subjects must be distinct');

  const notes = typeof b.notes === 'string' ? b.notes.trim() : '';
  if (notes.length > 500) errors.push('notes are limited to 500 characters');

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { round: String(b.round), studentId: String(b.studentId), overall: b.overall, domains, pattern, priorities, notes } };
}

const esc = (v) => {
  if (v === undefined || v === null) return '';
  const t = String(v);
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Rows: {student, rater, round, createdAt, updatedAt, overall, domains, pattern, priorities, notes}. Names/emails are never exported. */
export function facultyCsv(rows) {
  const cols = ['student', 'rater', 'round', 'overall', ...DOMAINS.map((d) => `domain_${d}`), 'pattern', 'priority_1', 'priority_2', 'priority_3', 'updated'];
  const line = (r) => [
    r.student, r.rater, r.round, r.overall,
    ...DOMAINS.map((d) => r.domains?.[d]),
    r.pattern, r.priorities?.[0], r.priorities?.[1], r.priorities?.[2],
    r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  ].map(esc).join(',');
  return [cols.join(','), ...rows.map(line)].join('\n');
}
