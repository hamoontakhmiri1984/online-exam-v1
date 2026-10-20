import { logEvent } from '../lib/logger';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  PORT: z.string().default('4000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  KAVENEGAR_API_KEY: z.string().default(''),
  RESEND_API_KEY: z.string().default(''),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // Set the trusted proxy count to match the deployment topology.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  ZARINPAL_MERCHANT_ID: z
    .string()
    .default('00000000-0000-0000-0000-000000000000'),
  ZARINPAL_SANDBOX: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  // Public backend origin used for payment callbacks.
  SERVER_URL: z.string().default('http://localhost:4000'),

  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('exam-platform-uploads'),
  // MinIO uses path-style bucket addressing.
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  SIGNED_URL_EXPIRES_IN: z
    .string()
    .default('300')
    .transform((v) => parseInt(v, 10)),

  // Public origin for blog/CMS assets; private lesson files use signed URLs.
  S3_PUBLIC_BASE_URL: z.string().default(''),
});

const parsedEnv = envSchema.parse(process.env);

// Production must not accept sandbox payments or default storage credentials.
if (parsedEnv.NODE_ENV === 'production') {
  for (const key of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
    if (!parsedEnv[key].trim() || parsedEnv[key].trim().toLowerCase() === 'minioadmin') {
      throw new Error(`${key} must be configured with non-default credentials in production`);
    }
  }
  const origin = new URL(parsedEnv.CLIENT_URL);
  const host = origin.hostname.toLowerCase().replace(/\.$/, '');
  if (origin.protocol !== 'https:' || origin.username || origin.password ||
      host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' ||
      host === '[::]' || /^\[::ffff:7f[0-9a-f]{2}:/.test(host) ||
      host === '0.0.0.0' || /^127\./.test(host) || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('CLIENT_URL must be a public HTTPS origin in production');
  }
  if (parsedEnv.ZARINPAL_SANDBOX) {
    throw new Error(
      'ZARINPAL_SANDBOX در production باید false باشه (sandbox=true یعنی پرداخت واقعی انجام نمی‌شه)'
    );
  }
  if (
    parsedEnv.ZARINPAL_MERCHANT_ID === '00000000-0000-0000-0000-000000000000'
  ) {
    throw new Error('ZARINPAL_MERCHANT_ID در production باید مرچنت واقعی باشه');
  }

  if (parsedEnv.TRUST_PROXY === 0) {
    logEvent('warn', 'هشدار: TRUST_PROXY=0 در production. اگه پشت proxy/load balancer هستی باید ۱ (یا تعداد proxy ها) باشه.');
  }
}

export const env = parsedEnv;
