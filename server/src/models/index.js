import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ROLE_PROFILES, SUBJECTS } from '../engine/config.js';

const { Schema, model } = mongoose;
const SLUGS = SUBJECTS.map((s) => s.slug);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    targetRole: { type: String, enum: Object.keys(ROLE_PROFILES), default: 'general' },
    placementDate: { type: Date },
  },
  { timestamps: true },
);

const subjectSchema = new Schema({
  slug: { type: String, enum: SLUGS, required: true, unique: true },
  name: { type: String, required: true },
  domain: { type: String, required: true },
  description: { type: String, default: '' },
});

/** Stable fingerprint so the question bank never holds near-identical duplicates. */
export function fingerprint(text) {
  const norm = String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return crypto.createHash('sha1').update(norm).digest('hex');
}

const questionSchema = new Schema(
  {
    subject: { type: String, enum: SLUGS, required: true, index: true },
    type: { type: String, enum: ['mcq', 'descriptive'], default: 'mcq' },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    options: { type: [String], default: undefined },
    correctIndex: { type: Number, min: 0, max: 5 },
    answer: { type: String, default: '' }, // model answer (descriptive) or short answer text
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium', index: true },
    topic: { type: String, default: '', trim: true },
    companies: { type: [String], default: [] },
    /** 0-100: how often this topic/question appears in placement tests (admin-curated). */
    frequency: { type: Number, min: 0, max: 100, default: 50, index: true },
    /** where `frequency` comes from: shown to students so editorial estimates are not mistaken for evidence */
    rankSource: { type: String, enum: ['editorial', 'expert', 'placement_records'], default: 'editorial' },
    tags: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    fingerprint: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
questionSchema.index({ subject: 1, fingerprint: 1 }, { unique: true });
questionSchema.index({ text: 'text', topic: 'text', tags: 'text' });
questionSchema.pre('validate', function setFingerprint(next) {
  if (this.text) this.fingerprint = fingerprint(this.text);
  if (this.type === 'mcq') {
    if (!this.options || this.options.length < 2) this.invalidate('options', 'MCQ needs at least 2 options');
    else if (this.correctIndex === undefined || this.correctIndex >= this.options.length) this.invalidate('correctIndex', 'correctIndex must point to an option');
  }
  next();
});

const attemptSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    selectedIndex: Number,
    correct: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
attemptSchema.index({ student: 1, createdAt: 1 });

const practicalSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: String, required: true }, // YYYY-MM-DD (Monday, UTC)
    projects: { type: Number, min: 0, max: 100 },
    mock: { type: Number, min: 0, max: 100 },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);
practicalSchema.index({ student: 1, weekStart: 1 }, { unique: true });

const snapshotSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true },
    score: Number,
    projected: Number,
    evidenceSufficiency: Number,
    engineVersion: String,
    configHash: String,
    skillState: Number,
    trajectoryQuality: Number,
    momentum: Number,
    consistency: Number,
    balance: Number,
    surge: Number,
    hopping: Number,
    patternClass: String,
    weeks: Number,
    /** per-domain mastery and per-role readiness, kept so the pilot can compare them with faculty rubrics */
    domains: Schema.Types.Mixed,
    roles: Schema.Types.Mixed,
    patterns: Schema.Types.Mixed,
  },
  { timestamps: true },
);
snapshotSchema.index({ student: 1, day: 1 }, { unique: true });

const ratingSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rater: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 0, max: 100, required: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

const settingSchema = new Schema({ key: { type: String, unique: true, required: true }, value: Schema.Types.Mixed });

export const User = model('User', userSchema);
export const Subject = model('Subject', subjectSchema);
export const Question = model('Question', questionSchema);
export const Attempt = model('Attempt', attemptSchema);
export const PracticalLog = model('PracticalLog', practicalSchema);
export const Snapshot = model('Snapshot', snapshotSchema);
export const ExpertRating = model('ExpertRating', ratingSchema);
export const Setting = model('Setting', settingSchema);
