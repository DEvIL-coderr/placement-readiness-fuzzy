/**
 * Domain knowledge for the engine: subjects, competency domains, role profiles
 * and the subject-relatedness function used by the fuzzy preparation linkograph.
 * Everything here is deliberately plain data so it can be audited / calibrated.
 */

export const DOMAINS = ['dsa', 'core', 'aptitude', 'communication', 'practical'];
export const QUESTION_DOMAINS = ['dsa', 'core', 'aptitude', 'communication'];

export const DOMAIN_LABELS = {
  dsa: 'DSA & Coding',
  core: 'Core CS',
  aptitude: 'Aptitude & Reasoning',
  communication: 'Communication & HR',
  practical: 'Projects & Mock Interviews',
};

export const SUBJECTS = [
  { slug: 'dsa', name: 'Data Structures & Algorithms', domain: 'dsa' },
  { slug: 'coding', name: 'Programming & Problem Solving', domain: 'dsa' },
  { slug: 'oop', name: 'Object-Oriented Programming', domain: 'core' },
  { slug: 'dbms', name: 'Database Management Systems', domain: 'core' },
  { slug: 'os', name: 'Operating Systems', domain: 'core' },
  { slug: 'cn', name: 'Computer Networks', domain: 'core' },
  { slug: 'web', name: 'Web Development', domain: 'core' },
  { slug: 'quant', name: 'Quantitative Aptitude', domain: 'aptitude' },
  { slug: 'logical', name: 'Logical Reasoning', domain: 'aptitude' },
  { slug: 'verbal', name: 'Verbal Ability', domain: 'communication' },
  { slug: 'hr', name: 'HR & Behavioural', domain: 'communication' },
];

export const SUBJECT_BY_SLUG = Object.fromEntries(SUBJECTS.map((s) => [s.slug, s]));

/** Importance (0..1) of each subject per target role. */
export const ROLE_PROFILES = {
  general: {
    label: 'General / Undecided',
    weights: Object.fromEntries(SUBJECTS.map((s) => [s.slug, 0.7])),
  },
  software_developer: {
    label: 'Software Developer',
    weights: { dsa: 1, coding: 1, oop: 0.8, dbms: 0.7, os: 0.6, cn: 0.4, web: 0.7, quant: 0.5, logical: 0.5, verbal: 0.4, hr: 0.4 },
  },
  data_analyst: {
    label: 'Data / Business Analyst',
    weights: { dsa: 0.6, coding: 0.8, oop: 0.3, dbms: 1, os: 0.2, cn: 0.2, web: 0.3, quant: 1, logical: 0.8, verbal: 0.6, hr: 0.5 },
  },
  it_services: {
    label: 'IT Services (mass recruiter)',
    weights: { dsa: 0.6, coding: 0.7, oop: 0.7, dbms: 0.7, os: 0.5, cn: 0.5, web: 0.4, quant: 1, logical: 1, verbal: 0.9, hr: 0.7 },
  },
  infra_network: {
    label: 'Infrastructure / Network Engineer',
    weights: { dsa: 0.4, coding: 0.5, oop: 0.4, dbms: 0.6, os: 1, cn: 1, web: 0.3, quant: 0.6, logical: 0.6, verbal: 0.5, hr: 0.5 },
  },
};

/** Expert-set pairwise topical relatedness (symmetric, 0..1). */
const PAIRS = {
  'dsa|coding': 0.8,
  'coding|oop': 0.6,
  'dsa|oop': 0.4,
  'dbms|web': 0.5,
  'cn|os': 0.5,
  'cn|web': 0.4,
  'dbms|os': 0.3,
  'logical|quant': 0.7,
  'hr|verbal': 0.7,
  'dsa|logical': 0.3,
  'coding|logical': 0.25,
  'coding|web': 0.4,
  'oop|web': 0.35,
};

export function relatedness(a, b) {
  if (a === b) return 1;
  const key = [a, b].sort().join('|');
  if (PAIRS[key] !== undefined) return PAIRS[key];
  const da = SUBJECT_BY_SLUG[a]?.domain;
  const db = SUBJECT_BY_SLUG[b]?.domain;
  return da && da === db ? 0.35 : 0.05;
}

/** Weights of the static baseline (and of the simulation's ground truth). */
export const STATIC_WEIGHTS = { dsa: 0.3, core: 0.25, aptitude: 0.2, communication: 0.15, practical: 0.1 };

export const ENGINE_DEFAULTS = {
  targetRole: 'general',
  horizonWeeks: 4, // how far ahead the forecast looks
  halfLifeWeeks: 3, // evidence half-life (forgetting)
  priorWeight: 4, // pseudo-observations pulling mastery toward priorMean
  priorMean: 40, // assumed mastery of an unassessed fresher (calibrate on real cohort data)
  minWeeklyAttempts: 15, // attempts for a week to count as an 'active' study week
  minDomainEvidence: 10, // weighted attempts before a domain counts as assessed
  chance: 0.25, // guess probability for 4-option MCQs
  damping: 0.6, // diminishing returns when extrapolating momentum
  momentumWindow: 6,
  minEventAttempts: 3, // attempts for a (week, subject) to count as a linkograph event
  orphanThreshold: 0.35,
  fullSeries: true,
};

export const DIFFICULTY_WEIGHT = { easy: 1, medium: 2, hard: 3 };
