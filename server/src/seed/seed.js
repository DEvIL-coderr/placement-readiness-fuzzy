/**
 * Seed script:  npm run seed        -> subjects, starter question bank, first admin
 *               npm run seed:demo   -> additionally 7 demo students (one per behaviour archetype)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { SUBJECTS } from '../engine/config.js';
import { CONSENT_VERSION } from '../services/privacy.js';
import { ARCHETYPES, mulberry32, simulateStudent } from '../engine/simulate.js';
import { Attempt, PracticalLog, Question, Subject, User } from '../models/index.js';
import { QUESTIONS, SUBJECT_DESCRIPTIONS } from './questions.js';

const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/placement_readiness';
const demo = process.argv.includes('--demo');
await mongoose.connect(uri);

for (const s of SUBJECTS) {
  await Subject.updateOne({ slug: s.slug }, { $set: { ...s, description: SUBJECT_DESCRIPTIONS[s.slug] ?? '' } }, { upsert: true });
}

let inserted = 0;
let skipped = 0;
for (const q of QUESTIONS) {
  try { await Question.create(q); inserted += 1; } catch (e) { if (e.code === 11000) skipped += 1; else throw e; }
}
console.log(`Subjects: ${SUBJECTS.length}; questions inserted: ${inserted}, already present: ${skipped}`);

const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
if (!(await User.exists({ email: adminEmail }))) {
  await User.create({ name: 'Administrator', email: adminEmail, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'ChangeMe123!', 10) });
  console.log(`Admin created: ${adminEmail}`);
}

if (demo) {
  const bank = await Question.find({ type: 'mcq' }).select('subject difficulty').lean();
  const bySubject = {};
  for (const q of bank) (bySubject[q.subject] ??= []).push(q);
  const weeks = 8;
  const mondayThisWeek = new Date();
  mondayThisWeek.setUTCHours(0, 0, 0, 0);
  mondayThisWeek.setUTCDate(mondayThisWeek.getUTCDate() - ((mondayThisWeek.getUTCDay() + 6) % 7));
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  let seed = 100;
  for (const archetype of ARCHETYPES) {
    const email = `demo.${archetype}@example.com`;
    await User.deleteOne({ email });
    const user = await User.create({ name: `Demo ${archetype}`, email, passwordHash, targetRole: 'software_developer', consentVersion: CONSENT_VERSION, consentAt: new Date() }); // synthetic demo students
    const rng = mulberry32(seed++);
    const sim = simulateStudent(archetype, rng, { weeks });
    const docs = sim.attempts
      .filter((a) => bySubject[a.subject]?.length)
      .map((a) => {
        const pool = bySubject[a.subject];
        const q = pool[Math.floor(rng() * pool.length)];
        const when = new Date(mondayThisWeek.getTime() - (weeks - 1 - a.week) * 7 * 86_400_000 + Math.floor(rng() * 6) * 86_400_000 + 9 * 3_600_000);
        return { student: user._id, question: q._id, subject: a.subject, difficulty: a.difficulty, correct: a.correct, createdAt: when };
      });
    await Attempt.insertMany(docs);
    for (const wk of sim.series) {
      if (!wk.practical) continue;
      const ws = new Date(mondayThisWeek.getTime() - (weeks - 1 - wk.week) * 7 * 86_400_000).toISOString().slice(0, 10);
      await PracticalLog.create({ student: user._id, weekStart: ws, projects: Math.round(wk.practical.projects), mock: Math.round(wk.practical.mock) });
    }
    console.log(`Demo student ${email} (${docs.length} attempts)`);
  }
  console.log('Demo password for all demo students: Demo@12345');
}

await mongoose.disconnect();
