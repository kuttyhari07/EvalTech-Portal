import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load from server/.env if present, then cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/evaltech'),
  JWT_SECRET: z.string().default('evaltech-super-secret-jwt-key-2025-secure-production-ready'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('https://eval-tech-portal.vercel.app').transform((val) => {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
      if (val.includes('localhost') || val.includes('127.0.0.1')) {
        return 'https://eval-tech-portal.vercel.app';
      }
    }
    if (val.includes('evaltech-portal.vercel.app')) {
      return val.replace('evaltech-portal.vercel.app', 'eval-tech-portal.vercel.app');
    }
    return val;
  }),
  COOKIE_DOMAIN: z.string().optional(),
  
  // Payment
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder_key'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_placeholder_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('whsec_placeholder_secret'),

  // Direct Merchant UPI Configuration (PhonePe Business / Paytm / BharatPe / Custom Webhook)
  UPI_MERCHANT_VPA: z.string().default('evaltech@okhdfcbank'),
  UPI_MERCHANT_NAME: z.string().default('EvalTech Enterprise'),
  UPI_WEBHOOK_SECRET: z.string().default('evaltech_upi_secret_token_2026'),

  // Email
  EMAIL_PROVIDER: z.enum(['brevo', 'resend', 'smtp', 'auto']).default('auto'),
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('EvalTech System <evaltech32@gmail.com>'),

  // AI Provider (Optional)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
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
