import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { ROLE_PROFILES } from '../engine/config.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validate, wrap } from '../middleware/util.js';
import { User } from '../models/index.js';
import { CONSENT_VERSION, needsConsent } from '../services/privacy.js';

const router = Router();
const roleKeys = Object.keys(ROLE_PROFILES);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  targetRole: z.enum(roleKeys).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'You must accept the study consent to register' }) }),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  targetRole: z.enum(roleKeys).optional(),
  placementDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, targetRole: u.targetRole, placementDate: u.placementDate ?? null, consentRequired: needsConsent(u) });

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const { name, email, password, targetRole } = req.body;
  if (await User.exists({ email })) return res.status(409).json({ error: 'Email already registered' });
  // Public registration always creates students. Admins are created via the seed script.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), targetRole, consentVersion: CONSENT_VERSION, consentAt: new Date() });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch('/me', requireAuth, validate(profileSchema), wrap(async (req, res) => {
  const { name, targetRole, placementDate } = req.body;
  if (name) req.user.name = name;
  if (targetRole) req.user.targetRole = targetRole;
  if (placementDate !== undefined) req.user.placementDate = placementDate ? new Date(placementDate) : undefined;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));

export default router;
