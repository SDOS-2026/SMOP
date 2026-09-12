import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().default(''),
  JWT_SECRET: z.string().default('development-only-secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  BODY_LIMIT: z.string().default('1mb'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  RELEASE_VERSION: z.string().default('development'),
  NVIDIA_API_KEY: z.string().default(''),
  NIM_MODEL: z.string().default('deepseek-ai/deepseek-v4-pro'),
  NIM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;

  if (!env.DATABASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'is required in production' });
  }
  if (env.JWT_SECRET.length < 32 || env.JWT_SECRET === 'development-only-secret') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'must be at least 32 characters in production' });
  }
  if (env.BCRYPT_SALT_ROUNDS < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['BCRYPT_SALT_ROUNDS'], message: 'must be at least 10 in production' });
  }
});

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = parsed.data;
  const origins = env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean);

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    database: { url: env.DATABASE_URL },
    jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
    cors: { origin: origins[0], origins },
    bcrypt: { saltRounds: env.BCRYPT_SALT_ROUNDS },
    http: { bodyLimit: env.BODY_LIMIT, shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS },
    releaseVersion: env.RELEASE_VERSION,
    nim: { apiKey: env.NVIDIA_API_KEY, model: env.NIM_MODEL, baseUrl: env.NIM_BASE_URL },
  } as const;
}

export const config = loadConfig();
