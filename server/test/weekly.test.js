import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSeries, isoDate, weekStart } from '../src/services/weekly.js';

test('weeks start on Monday (UTC)', () => {
  assert.equal(isoDate(weekStart('2026-11-07T10:00:00Z')), '2026-11-02'); // Saturday -> Monday
  assert.equal(isoDate(weekStart('2026-11-02T00:00:00Z')), '2026-11-02');
  assert.equal(isoDate(weekStart('2026-11-08T23:59:00Z')), '2026-11-02'); // Sunday
});

test('buildSeries returns [] with no data', () => {
  assert.deepEqual(buildSeries({}), []);
});

test('buildSeries fills inactive weeks and weights by difficulty', () => {
  const attempts = [
    { subject: 'dsa', correct: true, difficulty: 'hard', createdAt: '2026-10-05T09:00:00Z' },
    { subject: 'dsa', correct: false, difficulty: 'easy', createdAt: '2026-10-06T09:00:00Z' },
    { subject: 'os', correct: true, difficulty: 'medium', createdAt: '2026-10-26T09:00:00Z' },
  ];
  const s = buildSeries({ attempts, now: new Date('2026-10-28T00:00:00Z') });
  assert.equal(s.length, 4); // Oct 5, 12, 19, 26
  assert.deepEqual(s[0].subjects.dsa, { attempted: 2, wattempted: 4, wcorrect: 3 });
  assert.deepEqual(s[1].subjects, {});
  assert.deepEqual(s[2].subjects, {});
  assert.deepEqual(s[3].subjects.os, { attempted: 1, wattempted: 2, wcorrect: 2 });
  assert.deepEqual(s.map((w) => w.week), [0, 1, 2, 3]);
});

test('buildSeries extends to the current week (trailing inactivity is visible)', () => {
  const attempts = [{ subject: 'dsa', correct: true, difficulty: 'easy', createdAt: '2026-10-05T09:00:00Z' }];
  const s = buildSeries({ attempts, now: new Date('2026-11-07T00:00:00Z') });
  assert.equal(s.length, 5); // Oct 5, 12, 19, 26, Nov 2 (Nov 7 is a Saturday)
});

test('manual practical entries attach to their week; last entry in a week wins', () => {
  const s = buildSeries({
    attempts: [{ subject: 'dsa', correct: true, difficulty: 'easy', createdAt: '2026-10-05T09:00:00Z' }],
    manual: [
      { weekStart: '2026-10-06', projects: 40, mock: 30 },
      { weekStart: '2026-10-08', projects: 55, mock: 35 },
    ],
    now: new Date('2026-10-07T00:00:00Z'),
  });
  assert.deepEqual(s[0].practical, { projects: 55, mock: 35 });
});

import { mulberry32, simulateStudent } from '../src/engine/simulate.js';
import { analyze } from '../src/engine/analyze.js';

test('pipeline: raw attempts -> buildSeries reproduces the simulator weekly series and analysis', () => {
  const sim = simulateStudent('steady', mulberry32(21), { weeks: 8, startDate: '2026-01-05' });
  const attempts = sim.attempts.map((a) => ({
    subject: a.subject,
    difficulty: a.difficulty,
    correct: a.correct,
    createdAt: new Date(Date.parse('2026-01-05') + a.week * 7 * 86_400_000 + 3 * 3_600_000),
  }));
  const series = buildSeries({ attempts, now: new Date(Date.parse('2026-01-05') + 7 * 7 * 86_400_000 + 86_400_000) });
  assert.equal(series.length, 8);
  series.forEach((wk, i) => {
    for (const [slug, cell] of Object.entries(sim.series[i].subjects)) {
      assert.deepEqual(wk.subjects[slug], cell);
    }
  });
  const viaDb = analyze(series).readiness.score;
  const direct = analyze(sim.series.map((w) => ({ ...w, practical: null }))).readiness.score;
  assert.equal(viaDb, direct);
});
