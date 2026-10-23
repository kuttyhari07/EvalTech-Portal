import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load from .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/evaltech'),
  JWT_SECRET: z.string().default('evaltech-super-secret-jwt-key-change-in-production-2025'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  
  // Payment
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder_key'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_placeholder_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('whsec_placeholder_secret'),

  // Email
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('EvalTech System <noreply@evaltech.io>'),

  // AI Provider (Optional)
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Code Execution & Compiler Configuration
  COMPILER_PROVIDER: z.enum(['judge0', 'local_sandbox', 'piston']).default('local_sandbox'),
  JUDGE0_API_URL: z.string().default('https://judge0-ce.p.rapidapi.com'),
  JUDGE0_API_KEY: z.string().optional(),
  JUDGE0_AUTH_TOKEN: z.string().optional(),
  PISTON_API_URL: z.string().optional(),
  EXECUTION_TIMEOUT_MS: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MAX_SOURCE_CODE_BYTES: z.string().default('65536').transform((val) => parseInt(val, 10)),
  MAX_RUN_CODE_PER_MINUTE: z.string().default('15').transform((val) => parseInt(val, 10)),
  MAX_SUBMISSIONS_PER_QUESTION: z.string().default('10').transform((val) => parseInt(val, 10)),
});

export const config = envSchema.parse(process.env);
