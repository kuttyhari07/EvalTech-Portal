import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';

import { config } from './config/env';
import { connectDatabase } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { User, SubscriptionPlan } from './models';
import { ROLES, INITIAL_PLANS } from './constants';

// Import Routes
import authRoutes from './routes/auth.routes';
import orgRoutes from './routes/organization.routes';
import classRoutes from './routes/class.routes';
import studentRoutes from './routes/student.routes';
import subscriptionRoutes from './routes/subscription.routes';
import questionRoutes from './routes/question.routes';
import aiRoutes from './routes/ai.routes';
import examRoutes from './routes/exam.routes';
import attemptRoutes from './routes/attempt.routes';
import resultRoutes from './routes/result.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';
import healthRoutes from './routes/health.routes';
import programmingQuestionRoutes from './routes/programmingQuestion.routes';
import codeExecutionRoutes from './routes/codeExecution.routes';
import studentPortalRoutes from './routes/studentPortal.routes';

const app = express();

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin: [config.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limit
app.use('/api', generalLimiter);

// Mount Modular Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/programming-questions', programmingQuestionRoutes);
app.use('/api/code-executions', codeExecutionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/student-portal', studentPortalRoutes);

// Centralized Error Handling
app.use(errorHandler);

/**
 * Seed essential system defaults on first startup
 */
async function seedSystemDefaults(): Promise<void> {
  try {
    // 1. Seed Subscription Plans
    const planCount = await SubscriptionPlan.countDocuments();
    if (planCount === 0) {
      await SubscriptionPlan.insertMany(INITIAL_PLANS);
      console.log('[Seed] Subscription plans seeded.');
    }

    // 2. Seed Default Super Admin Account if not exists
    const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (!superAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@EvalTech2025!', salt);
      await User.create({
        name: 'Super Admin',
        email: 'admin@evaltech.io',
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        status: 'active',
        emailVerified: true,
      });
      console.log('[Seed] Default Super Admin account created: admin@evaltech.io / Admin@EvalTech2025!');
    }
  } catch (err: any) {
    console.error('[Seed] Error seeding system defaults:', err.message);
  }
}

// Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDatabase()
    .then(async () => {
      await seedSystemDefaults();
      app.listen(config.PORT, () => {
        console.log(`[EvalTech API] Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
      });
    })
    .catch((err) => {
      console.error('[EvalTech API] Fatal startup error:', err);
      process.exit(1);
    });
}

export default app;
