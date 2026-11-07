import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { Attempt, ExpertRating, FacultyAssessment, PracticalLog, Snapshot, User } from '../models/index.js';
import { buildExport, CONSENT_VERSION } from '../services/privacy.js';

const router = Router();
router.use(requireAuth, requireRole('student'));

router.post('/consent', validate(z.object({ accept: z.literal(true) })), wrap(async (req, res) => {
  req.user.consentVersion = CONSENT_VERSION;
  req.user.consentAt = new Date();
  await req.user.save();
  res.json({ consentVersion: CONSENT_VERSION, consentAt: req.user.consentAt });
}));

router.get('/export', wrap(async (req, res) => {
  const [attempts, practical, snapshots] = await Promise.all([
    Attempt.find({ student: req.user._id }).sort({ createdAt: 1 }).lean(),
    PracticalLog.find({ student: req.user._id }).sort({ weekStart: 1 }).lean(),
    Snapshot.find({ student: req.user._id }).sort({ day: 1 }).lean(),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="my-placement-readiness-data.json"');
  res.json(buildExport({ user: req.user, attempts, practical, snapshots }));
}));

/** Withdrawal: deletes the account and every record about the student, including faculty ratings of them. */
router.delete('/account', validate(z.object({ password: z.string().min(1) })), wrap(async (req, res) => {
  const withHash = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.password, withHash.passwordHash))) return res.status(403).json({ error: 'Password is incorrect' });
  const student = req.user._id;
  await Promise.all([
    Attempt.deleteMany({ student }),
    PracticalLog.deleteMany({ student }),
    Snapshot.deleteMany({ student }),
    ExpertRating.deleteMany({ student }),
    FacultyAssessment.deleteMany({ student }),
  ]);
  await User.deleteOne({ _id: student });
  res.json({ deleted: true });
}));

export default router;
