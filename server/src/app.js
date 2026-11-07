import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/util.js';
import adminRoutes from './routes/admin.js';
import analysisRoutes from './routes/analysis.js';
import authRoutes from './routes/auth.js';
import progressRoutes from './routes/progress.js';
import questionRoutes from './routes/questions.js';
import quizRoutes from './routes/quiz.js';
import subjectRoutes from './routes/subjects.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',') }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
