import { Router } from 'express';
import { z } from 'zod';
import { DOMAIN_LABELS, ROLE_PROFILES, SUBJECTS } from '../engine/config.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { Question, Subject } from '../models/index.js';

const router = Router();

router.get('/', requireAuth, wrap(async (req, res) => {
  const [subjects, counts] = await Promise.all([
    Subject.find().lean(),
    Question.aggregate([{ $match: { active: true } }, { $group: { _id: { s: '$subject', t: '$type' }, n: { $sum: 1 } } }]),
  ]);
  const bySlug = Object.fromEntries(subjects.map((s) => [s.slug, s]));
  const count = (slug, type) => counts.find((c) => c._id.s === slug && c._id.t === type)?.n ?? 0;
  res.json({
    subjects: SUBJECTS.map((s) => ({
      ...s,
      description: bySlug[s.slug]?.description ?? '',
      mcqCount: count(s.slug, 'mcq'),
      descriptiveCount: count(s.slug, 'descriptive'),
    })),
    domains: DOMAIN_LABELS,
    roles: Object.fromEntries(Object.entries(ROLE_PROFILES).map(([k, v]) => [k, v.label])),
  });
}));

// Subjects map 1:1 to the engine's competency domains, so admins can edit text but not add new slugs.
router.put('/:slug', requireAuth, requireAdmin, validate(z.object({ name: z.string().min(2).max(100).optional(), description: z.string().max(500).optional() })), wrap(async (req, res) => {
  const s = await Subject.findOneAndUpdate({ slug: req.params.slug }, { $set: req.body }, { new: true });
  if (!s) return res.status(404).json({ error: 'Unknown subject' });
  res.json({ subject: s });
}));

export default router;
