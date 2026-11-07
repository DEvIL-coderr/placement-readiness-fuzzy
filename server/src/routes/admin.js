import { Router } from 'express';
import { z } from 'zod';
import { fitLinear } from '../engine/calibration.js';
import { ENGINE_VERSION } from '../engine/config.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { Attempt, ExpertRating, Question, Setting, Snapshot, User } from '../models/index.js';
import { analyzeStudent } from '../services/analysis.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', wrap(async (req, res) => {
  const [students, questions, attempts, ratings] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Question.countDocuments(),
    Attempt.countDocuments(),
    ExpertRating.countDocuments(),
  ]);
  res.json({ students, questions, attempts, ratings });
}));

router.get('/students', wrap(async (req, res) => {
  const students = await User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(200).lean();
  const snaps = await Snapshot.aggregate([{ $sort: { day: -1 } }, { $group: { _id: '$student', last: { $first: '$$ROOT' } } }]);
  const byStudent = new Map(snaps.map((s) => [String(s._id), s.last]));
  res.json({
    students: students.map((u) => {
      const s = byStudent.get(String(u._id));
      return { id: u._id, name: u.name, email: u.email, targetRole: u.targetRole, score: s?.score ?? null, projected: s?.projected ?? null, pattern: s?.patternClass ?? null, lastDay: s?.day ?? null };
    }),
  });
}));

// Force a fresh analysis for every student (also refreshes snapshots used for calibration/export).
router.post('/refresh', wrap(async (req, res) => {
  const students = await User.find({ role: 'student' });
  let done = 0;
  for (const u of students) { await analyzeStudent(u); done += 1; }
  res.json({ refreshed: done });
}));

const ratingBody = z.object({ studentId: z.string().length(24), rating: z.number().min(0).max(100), notes: z.string().max(500).optional() });
router.post('/ratings', validate(ratingBody), wrap(async (req, res) => {
  const student = await User.findById(req.body.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  await analyzeStudent(student); // make sure a same-day snapshot exists to pair with the rating
  const r = await ExpertRating.create({ student: student._id, rater: req.user._id, rating: req.body.rating, notes: req.body.notes });
  res.status(201).json({ rating: r });
}));

router.get('/ratings', wrap(async (req, res) => {
  res.json({ items: await ExpertRating.find().sort({ createdAt: -1 }).limit(200).populate('student', 'name email').lean() });
}));

/** Pair each expert rating with the student's snapshot from the same day (or the latest earlier one). */
async function ratingPairs() {
  const ratings = await ExpertRating.find().lean();
  const pairs = [];
  for (const r of ratings) {
    const day = r.createdAt.toISOString().slice(0, 10);
    const snap = await Snapshot.findOne({ student: r.student, day: { $lte: day } }).sort({ day: -1 }).lean();
    if (snap) pairs.push({ student: String(r.student), day: snap.day, score: snap.score, projected: snap.projected, rating: r.rating });
  }
  return pairs;
}

router.post('/calibration/fit', wrap(async (req, res) => {
  const pairs = await ratingPairs();
  const cal = fitLinear(pairs);
  if (!cal) return res.status(400).json({ error: 'Need at least 5 expert ratings with matching snapshots', pairs: pairs.length });
  const stamped = { ...cal, fittedAt: new Date().toISOString(), engineVersion: ENGINE_VERSION };
  const hist = (await Setting.findOne({ key: 'calibrationHistory' }).lean())?.value ?? [];
  await Setting.findOneAndUpdate({ key: 'calibration' }, { value: stamped }, { upsert: true });
  await Setting.findOneAndUpdate({ key: 'calibrationHistory' }, { value: [...hist, stamped].slice(-50) }, { upsert: true });
  res.json({ calibration: stamped, versions: hist.length + 1 });
}));

router.get('/calibration/history', wrap(async (req, res) => {
  res.json({ items: (await Setting.findOne({ key: 'calibrationHistory' }).lean())?.value ?? [] });
}));

router.delete('/calibration', wrap(async (req, res) => { await Setting.deleteOne({ key: 'calibration' }); res.json({ ok: true }); }));

/** CSV export for offline statistics (SPSS/R/Python) when preparing the paper. */
router.get('/export/dataset.csv', wrap(async (req, res) => {
  const pairs = await ratingPairs();
  const snaps = await Snapshot.find().sort({ day: 1 }).lean();
  const scalar = ['student', 'day', 'score', 'projected', 'evidenceSufficiency', 'engineVersion', 'configHash', 'skillState', 'trajectoryQuality', 'momentum', 'consistency', 'balance', 'surge', 'hopping', 'patternClass', 'weeks'];
  const domainKeys = [...new Set(snaps.flatMap((s) => Object.keys(s.domains ?? {})))].sort();
  const roleKeys = [...new Set(snaps.flatMap((s) => Object.keys(s.roles ?? {})))].sort();
  const patternKeys = [...new Set(snaps.flatMap((s) => Object.keys(s.patterns ?? {})))].sort();
  const cols = [...scalar, ...domainKeys.map((k) => `domain_${k}`), ...roleKeys.map((k) => `role_${k}`), ...patternKeys.map((k) => `pattern_${k}`)];
  const val = (s, c) => (c.startsWith('domain_') ? s.domains?.[c.slice(7)] : c.startsWith('role_') ? s.roles?.[c.slice(5)] : c.startsWith('pattern_') ? s.patterns?.[c.slice(8)] : s[c]);
  const esc = (v) => {
    if (v === undefined || v === null) return '';
    const t = String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [cols.join(','), ...snaps.map((s) => cols.map((c) => esc(val(s, c))).join(','))];
  const key = (p) => `${p.student}|${p.day}`;
  const ratingBy = new Map(pairs.map((p) => [key(p), p.rating]));
  lines[0] += ',expert_rating';
  snaps.forEach((s, i) => { lines[i + 1] += `,${ratingBy.get(`${s.student}|${s.day}`) ?? ''}`; });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="prep-snapshots.csv"');
  res.send(lines.join('\n'));
}));

export default router;
