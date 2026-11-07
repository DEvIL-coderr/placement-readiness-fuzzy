import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { SUBJECTS } from '../engine/config.js';
import { requireAuth, requireConsent } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { Attempt, Question } from '../models/index.js';

const router = Router();
const slugs = SUBJECTS.map((s) => s.slug);

const startQuery = z.object({
  subject: z.enum(slugs),
  count: z.coerce.number().int().min(1).max(30).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
});

/** Start a quiz: random auto-gradable questions, answers withheld. */
router.get('/start', requireAuth, validate(startQuery, 'query'), wrap(async (req, res) => {
  const { subject, count, difficulty } = req.query;
  const match = { active: true, type: 'mcq', subject };
  if (difficulty !== 'mixed') match.difficulty = difficulty;
  const sampled = await Question.aggregate([{ $match: match }, { $sample: { size: count } }, { $project: { text: 1, options: 1, difficulty: 1, topic: 1, subject: 1 } }]);
  if (!sampled.length) return res.status(404).json({ error: 'No questions available for this selection' });
  res.json({ subject, questions: sampled.map((q) => ({ id: q._id, text: q.text, options: q.options, difficulty: q.difficulty, topic: q.topic })) });
}));

const submitBody = z.object({
  answers: z.array(z.object({ questionId: z.string().refine(mongoose.isValidObjectId, 'invalid id'), selectedIndex: z.number().int().min(-1).max(5) })).min(1).max(50),
});

/** Grade server-side and record every attempt (this is the data the fuzzy engine consumes). */
router.post('/submit', requireAuth, requireConsent, validate(submitBody), wrap(async (req, res) => {
  const seen = new Set();
  const answers = req.body.answers.filter((a) => (seen.has(a.questionId) ? false : seen.add(a.questionId)));
  const questions = await Question.find({ _id: { $in: answers.map((a) => a.questionId) }, type: 'mcq', active: true }).lean();
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  const docs = [];
  const results = [];
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const correct = a.selectedIndex === q.correctIndex;
    docs.push({ student: req.user._id, question: q._id, subject: q.subject, difficulty: q.difficulty, selectedIndex: a.selectedIndex, correct });
    results.push({ questionId: q._id, correct, selectedIndex: a.selectedIndex, correctIndex: q.correctIndex, explanation: q.explanation });
  }
  if (!docs.length) return res.status(400).json({ error: 'No valid questions submitted' });
  await Attempt.insertMany(docs);

  const score = results.filter((r) => r.correct).length;
  res.json({ score, total: results.length, percentage: Math.round((100 * score) / results.length), results });
}));

export default router;
