import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireConsent } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { Attempt, PracticalLog } from '../models/index.js';
import { buildSeries, isoDate, weekStart } from '../services/weekly.js';

const router = Router();

const practicalBody = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  projects: z.number().min(0).max(100).optional(),
  mock: z.number().min(0).max(100).optional(),
  note: z.string().max(500).optional(),
}).refine((b) => b.projects !== undefined || b.mock !== undefined, 'Provide projects and/or mock score');

/** Log self-assessed project quality and mock-interview score (0-100) for a week. */
router.post('/practical', requireAuth, requireConsent, validate(practicalBody), wrap(async (req, res) => {
  const ws = isoDate(weekStart(req.body.weekStart ?? new Date()));
  const set = {};
  for (const k of ['projects', 'mock', 'note']) if (req.body[k] !== undefined) set[k] = req.body[k];
  const log = await PracticalLog.findOneAndUpdate({ student: req.user._id, weekStart: ws }, { $set: set }, { upsert: true, new: true });
  res.status(201).json({ log });
}));

router.get('/practical', requireAuth, wrap(async (req, res) => {
  res.json({ items: await PracticalLog.find({ student: req.user._id }).sort({ weekStart: -1 }).limit(60).lean() });
}));

/** Weekly activity summary (attempts and raw accuracy per week). */
router.get('/weekly', requireAuth, wrap(async (req, res) => {
  const attempts = await Attempt.find({ student: req.user._id }).select('subject difficulty correct createdAt').lean();
  const series = buildSeries({ attempts });
  res.json({
    weeks: series.map((w) => {
      const cells = Object.values(w.subjects);
      const attempted = cells.reduce((s, c) => s + c.attempted, 0);
      const wa = cells.reduce((s, c) => s + c.wattempted, 0);
      const wc = cells.reduce((s, c) => s + c.wcorrect, 0);
      return { week: w.week, date: w.date, attempted, accuracy: wa ? Math.round((100 * wc) / wa) : null, subjects: Object.keys(w.subjects) };
    }),
  });
}));

export default router;
