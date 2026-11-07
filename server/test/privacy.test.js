import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildExport, CONSENT_VERSION, needsConsent } from '../src/services/privacy.js';

test('only students without the current consent need to consent', () => {
  assert.equal(needsConsent({ role: 'student' }), true);
  assert.equal(needsConsent({ role: 'student', consentVersion: '0.9' }), true);
  assert.equal(needsConsent({ role: 'student', consentVersion: CONSENT_VERSION }), false);
  assert.equal(needsConsent({ role: 'admin' }), false);
  assert.equal(needsConsent({ role: 'faculty' }), false);
});

test('export contains the student\'s own data and no faculty ratings or password data', () => {
  const out = buildExport({
    user: { name: 'A', email: 'a@x.in', targetRole: 'general', passwordHash: 'SECRET', consentVersion: '1.0' },
    attempts: [{ question: 'q1', subject: 'dsa', difficulty: 'easy', correct: true, createdAt: new Date('2026-11-01') }],
    practical: [{ weekStart: '2026-11-02', projects: 60 }],
    snapshots: [{ day: '2026-11-07', score: 55, projected: 60, patternClass: 'steady_growth', engineVersion: '2.0.0' }],
    now: new Date('2026-11-07T00:00:00Z'),
  });
  assert.equal(out.quizAttempts.length, 1);
  assert.equal(out.practicalLogs[0].mock, null);
  assert.equal(out.readinessSnapshots[0].score, 55);
  const text = JSON.stringify(out);
  assert.ok(!text.includes('SECRET'));
  assert.ok(!/faculty|rating/i.test(Object.keys(out).join(',')));
});
