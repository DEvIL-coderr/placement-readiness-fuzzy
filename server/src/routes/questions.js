import { Router } from 'express';
import { z } from 'zod';
import { SUBJECTS } from '../engine/config.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { escapeRegex, validate, wrap } from '../middleware/util.js';
import { Question } from '../models/index.js';

const router = Router();
const slugs = SUBJECTS.map((s) => s.slug);

const questionBody = z.object({
  subject: z.enum(slugs),
  type: z.enum(['mcq', 'descriptive']).default('mcq'),
  text: z.string().trim().min(8).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6).optional(),
  correctIndex: z.number().int().min(0).max(5).optional(),
  answer: z.string().max(4000).optional(),
  explanation: z.string().max(2000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic: z.string().trim().max(100).optional(),
  companies: z.array(z.string().trim().max(60)).max(20).optional(),
  frequency: z.number().min(0).max(100).default(50),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  active: z.boolean().optional(),
}).superRefine((q, ctx) => {
  if (q.type === 'mcq') {
    if (!q.options || q.options.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'MCQ needs at least 2 options' });
    else if (q.correctIndex === undefined || q.correctIndex >= q.options.length) ctx.addIssue({ code: 'custom', path: ['correctIndex'], message: 'correctIndex must point to an option' });
  } else if (!q.answer) {
    ctx.addIssue({ code: 'custom', path: ['answer'], message: 'Descriptive questions need a model answer' });
  }
});

const listQuery = z.object({
  subject: z.enum(slugs).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  type: z.enum(['mcq', 'descriptive']).optional(),
  topic: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(['top', 'new']).default('top'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Study view: students may see answers here (the graded quiz endpoint never exposes them in advance).
router.get('/', requireAuth, validate(listQuery, 'query'), wrap(async (req, res) => {
  const { subject, difficulty, type, topic, q, sort, page, limit } = req.query;
  const filter = req.user.role === 'admin' ? {} : { active: true };
  if (subject) filter.subject = subject;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (topic) filter.topic = new RegExp(`^${escapeRegex(topic)}$`, 'i');
  if (q) filter.text = new RegExp(escapeRegex(q), 'i');
  const order = sort === 'top' ? { frequency: -1, createdAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Question.find(filter).sort(order).skip((page - 1) * limit).limit(limit).select('-fingerprint').lean(),
    Question.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

/** Top questions of a subject, ranked by admin-curated frequency. */
router.get('/top', requireAuth, validate(z.object({ subject: z.enum(slugs).optional(), limit: z.coerce.number().int().min(1).max(50).default(10) }), 'query'), wrap(async (req, res) => {
  const filter = { active: true };
  if (req.query.subject) filter.subject = req.query.subject;
  const items = await Question.find(filter).sort({ frequency: -1, createdAt: -1 }).limit(req.query.limit).select('-fingerprint').lean();
  res.json({ items });
}));

router.get('/topics', requireAuth, wrap(async (req, res) => {
  const topics = await Question.aggregate([{ $match: { active: true, topic: { $ne: '' } } }, { $group: { _id: { s: '$subject', t: '$topic' }, n: { $sum: 1 } } }, { $sort: { '_id.s': 1, '_id.t': 1 } }]);
  res.json({ topics: topics.map((t) => ({ subject: t._id.s, topic: t._id.t, count: t.n })) });
}));

router.post('/', requireAuth, requireAdmin, validate(questionBody), wrap(async (req, res) => {
  const q = await Question.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ question: q });
}));

router.post('/bulk', requireAuth, requireAdmin, validate(z.object({ questions: z.array(z.unknown()).min(1).max(500) })), wrap(async (req, res) => {
  const result = { inserted: 0, duplicates: 0, invalid: [] };
  for (const [i, raw] of req.body.questions.entries()) {
    const parsed = questionBody.safeParse(raw);
    if (!parsed.success) { result.invalid.push({ index: i, errors: parsed.error.flatten().fieldErrors }); continue; }
    try {
      await Question.create({ ...parsed.data, createdBy: req.user._id });
      result.inserted += 1;
    } catch (e) {
      if (e?.code === 11000) result.duplicates += 1;
      else result.invalid.push({ index: i, errors: String(e.message) });
    }
  }
  res.status(result.inserted ? 201 : 200).json(result);
}));

router.put('/:id', requireAuth, requireAdmin, validate(questionBody), wrap(async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  q.set({ options: undefined, correctIndex: undefined, ...req.body });
  await q.save();
  res.json({ question: q });
}));

router.delete('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const q = await Question.findByIdAndDelete(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  res.json({ ok: true });
}));

export default router;
