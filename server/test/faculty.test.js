import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facultyCsv, validateAssessment } from '../src/services/faculty.js';

const base = { studentId: 'a'.repeat(24), round: 'R1', overall: 62 };

test('valid assessment is normalised', () => {
  const r = validateAssessment({ ...base, domains: { dsa: 70, core: '' }, pattern: 'skill_hopping', priorities: ['dsa', 'dbms'], notes: ' ok ' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.domains, { dsa: 70 });
  assert.equal(r.value.notes, 'ok');
  assert.equal(r.value.pattern, 'skill_hopping');
});

test('invalid assessments are rejected with reasons', () => {
  const bad = (patch) => validateAssessment({ ...base, ...patch });
  assert.equal(bad({ overall: 101 }).ok, false);
  assert.equal(bad({ overall: '60' }).ok, false);
  assert.equal(bad({ round: '' }).ok, false);
  assert.equal(bad({ studentId: 'xyz' }).ok, false);
  assert.equal(bad({ domains: { music: 50 } }).ok, false);
  assert.equal(bad({ domains: { dsa: -1 } }).ok, false);
  assert.equal(bad({ pattern: 'magic' }).ok, false);
  assert.equal(bad({ priorities: ['dsa', 'dsa'] }).ok, false);
  assert.equal(bad({ priorities: ['dsa', 'os', 'cn', 'web'] }).ok, false);
  assert.equal(bad({ priorities: ['nothing'] }).ok, false);
  assert.equal(bad({ notes: 'x'.repeat(501) }).ok, false);
  assert.equal(validateAssessment(null).ok, false);
});

test('faculty CSV escapes fields and never includes names or emails', () => {
  const csv = facultyCsv([{ student: 's1', rater: 'f1', round: 'R1', overall: 60, domains: { dsa: 55 }, pattern: 'steady_growth', priorities: ['dsa'], updatedAt: new Date('2026-11-07T00:00:00Z') }, { student: 's2', rater: 'f1', round: 'R "2", x', overall: 40, domains: {}, priorities: [] }]);
  const [head, a, b] = csv.split('\n');
  assert.match(head, /^student,rater,round,overall,domain_dsa/);
  assert.match(a, /^s1,f1,R1,60,55,,,,,steady_growth,dsa,,,2026-11-07T00:00:00.000Z$/);
  assert.ok(b.includes('"R ""2"", x"'));
  assert.ok(!/name|email/i.test(head));
});
