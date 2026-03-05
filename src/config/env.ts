import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  RED_ALERT_API_URL: z.string().url().default('https://api.tzevaadom.co.il/alerts.json'),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2500),
  DEDUP_TTL_SECONDS: z.coerce.number().int().positive().default(30),
  DEDUP_USER_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  TELEGRAM_SEND_CONCURRENCY: z.coerce.number().int().positive().default(50),
  TELEGRAM_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  HEALTH_PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_COMMANDS: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
