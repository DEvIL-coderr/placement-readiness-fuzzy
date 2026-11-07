import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { needsConsent } from '../services/privacy.js';

export const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET must be set (>= 16 chars)');
  return s;
};

export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET(), { expiresIn: '7d' });

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, JWT_SECRET());
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export const requireRole = (...roles) => (req, res, next) => (roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Access denied for this account type' }));

/** Study data is only collected from students who accepted the current consent text. */
export function requireConsent(req, res, next) {
  if (needsConsent(req.user)) return res.status(403).json({ error: 'Please accept the study consent first', code: 'CONSENT_REQUIRED' });
  return next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  return next();
}
