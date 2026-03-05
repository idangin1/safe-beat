import { Context, NextFunction } from 'grammy';
import Redis from 'ioredis';
import { logger } from '../../logger';

const RATE_LIMIT_WINDOW_SECONDS = 60;

export function createRateLimitMiddleware(redis: Redis, maxCommands: number) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    const key = `ratelimit:${userId}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    if (count > maxCommands) {
      logger.debug('Rate limit exceeded', { userId, count });
      await ctx.reply(
        `⛔ שלחת יותר מדי פקודות. נסה שוב בעוד דקה.`,
      );
      return;
    }

    await next();
  };
}
