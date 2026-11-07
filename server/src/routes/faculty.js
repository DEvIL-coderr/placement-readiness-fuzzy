import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap } from '../middleware/util.js';
import { ExpertRating, FacultyAssessment, User } from '../models/index.js';
import { PATTERNS, validateAssessment } from '../services/faculty.js';
import { analyzeStudent } from '../services/analysis.js';

/**
 * Blind faculty assessment. These routes NEVER return a system score, forecast, pattern or recommendation:
 * faculty see only names and their own previous ratings, so ratings are independent of the model under test.
 */
const router = Router();
router.use(requireAuth, requireRole('faculty'));

router.get('/meta', (req, res) => res.json({ patterns: PATTERNS }));

router.get('/students', wrap(async (req, res) => {
  const round = String(req.query.round ?? '');
  const [students, mine] = await Promise.all([
    User.find({ role: 'student' }).select('name').sort({ name: 1 }).lean(),
    round ? FacultyAssessment.find({ rater: req.user._id, round }).select('student').lean() : [],
  ]);
  const rated = new Set(mine.map((a) => String(a.student)));
  res.json({ items: students.map((s) => ({ id: s._id, name: s.name, rated: rated.has(String(s._id)) })) });
}));

router.get('/assessments/:studentId', wrap(async (req, res) => {
  const round = String(req.query.round ?? '');
  const a = await FacultyAssessment.findOne({ student: req.params.studentId, rater: req.user._id, round }).lean();
  res.json({ assessment: a ? { overall: a.overall, domains: a.domains ?? {}, pattern: a.pattern ?? '', priorities: a.priorities ?? [], notes: a.notes ?? '' } : null });
}));

router.post('/assessments', wrap(async (req, res) => {
  const v = validateAssessment(req.body);
  if (!v.ok) return res.status(400).json({ error: 'Validation failed', details: v.errors });
  const { studentId, round, overall, domains, pattern, priorities, notes } = v.value;
  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const a = await FacultyAssessment.findOneAndUpdate(
    { student: student._id, rater: req.user._id, round },
    { overall, domains, pattern, priorities, notes },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  // Keep calibration data in sync: pair the overall rating with a same-day snapshot (computed server-side, never returned).
  await analyzeStudent(student);
  await ExpertRating.findOneAndUpdate(
    { student: student._id, rater: req.user._id, round },
    { rating: overall, notes },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ saved: true, updatedAt: a.updatedAt });
}));

export default router;
