import { config } from './config/env';
import { logger } from './logger';
import Redis from 'ioredis';
import { RedisUserStore } from './user-store/redis-store';
import { Deduplication } from './deduplication/dedup';
import { AlertPoller } from './alert-poller/poller';
import { TelegramSender } from './sender/telegram-sender';
import { AlertProcessor } from './alert-processor/processor';
import { createBot } from './bot/bot';
import { createHealthServer } from './health/server';
import { NormalizedAlert } from './types';

async function main(): Promise<void> {
  logger.info('Starting SafeBeat', { env: config.NODE_ENV });

  // Redis
  const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: true,
  });

  redis.on('error', (err: Error) => logger.error('Redis error', { message: err.message }));
  redis.on('connect', () => logger.info('Redis connected'));
  await redis.connect();

  // Core services
  const store = new RedisUserStore(redis);
  const dedup = new Deduplication(redis, config.DEDUP_TTL_SECONDS, config.DEDUP_USER_TTL_SECONDS);

  // Telegram bot
  const bot = createBot(config.TELEGRAM_BOT_TOKEN, redis, store, config.RATE_LIMIT_COMMANDS);
  const sender = new TelegramSender(bot, config.TELEGRAM_RETRY_ATTEMPTS);

  // Alert pipeline
  const processor = new AlertProcessor(store, dedup, sender, config.TELEGRAM_SEND_CONCURRENCY);
  const poller = new AlertPoller(config.RED_ALERT_API_URL, config.POLL_INTERVAL_MS);

  poller.on('alert', (alert: NormalizedAlert) => {
    processor.process(alert).catch((err: unknown) => {
      logger.error('Alert processing error', { error: err instanceof Error ? err.message : err });
    });
  });

  // Health server
  const health = createHealthServer(config.HEALTH_PORT);
  await health.start();

  // Start bot and poller
  poller.start();
  bot.start({
    onStart: (info) => { logger.info('Bot started', { username: info.username }); },
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutting down', { signal });
    poller.stop();
    await bot.stop();
    await health.stop();
    await redis.quit();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.once('SIGTERM', () => { shutdown('SIGTERM').catch(() => process.exit(1)); });
  process.once('SIGINT', () => { shutdown('SIGINT').catch(() => process.exit(1)); });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });
}

main().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
