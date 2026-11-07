import { Router } from 'express';
import { z } from 'zod';
import { analyze } from '../engine/analyze.js';
import { ROLE_PROFILES } from '../engine/config.js';
import { ARCHETYPES, mulberry32, simulateStudent } from '../engine/simulate.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { User } from '../models/index.js';
import { analyzeStudent } from '../services/analysis.js';

const router = Router();

router.get('/me', requireAuth, wrap(async (req, res) => res.json(await analyzeStudent(req.user))));

router.get('/students/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json({ student: { id: student._id, name: student.name, email: student.email, targetRole: student.targetRole }, analysis: await analyzeStudent(student, { persist: false }) });
}));

/** Demo: analyse a synthetic student of a given archetype (no data stored). */
const simQuery = z.object({
  archetype: z.enum(ARCHETYPES).default('steady'),
  weeks: z.coerce.number().int().min(2).max(12).default(8),
  seed: z.coerce.number().int().default(1),
  targetRole: z.enum(Object.keys(ROLE_PROFILES)).default('general'),
});
router.get('/simulate', requireAuth, validate(simQuery, 'query'), wrap(async (req, res) => {
  const { archetype, weeks, seed, targetRole } = req.query;
  const sim = simulateStudent(archetype, mulberry32(seed), { weeks });
  res.json({ simulated: true, archetype, analysis: analyze(sim.series, { targetRole }) });
}));

export default router;
