/** Consent and personal-data helpers (pure, unit-tested). */
export const CONSENT_VERSION = '1.0';

/** Students must have accepted the current consent text before any study data is collected. */
export const needsConsent = (user) => user?.role === 'student' && user.consentVersion !== CONSENT_VERSION;

/**
 * Everything the system stores about a student, for their own download.
 * Faculty ratings are research data and are deliberately not included (see docs/PILOT-PROTOCOL.md).
 */
export function buildExport({ user, attempts = [], practical = [], snapshots = [], now = new Date() }) {
  return {
    exportedAt: now.toISOString(),
    consentVersion: CONSENT_VERSION,
    profile: {
      name: user.name,
      email: user.email,
      targetRole: user.targetRole,
      placementDate: user.placementDate ?? null,
      consentVersion: user.consentVersion ?? null,
      consentAt: user.consentAt ?? null,
      registeredAt: user.createdAt ?? null,
    },
    quizAttempts: attempts.map((a) => ({ questionId: String(a.question), subject: a.subject, difficulty: a.difficulty, correct: a.correct, at: a.createdAt })),
    practicalLogs: practical.map((p) => ({ weekStart: p.weekStart, projects: p.projects ?? null, mock: p.mock ?? null, note: p.note ?? '' })),
    readinessSnapshots: snapshots.map((s) => ({ day: s.day, score: s.score, projected: s.projected, patternClass: s.patternClass, engineVersion: s.engineVersion })),
  };
}
