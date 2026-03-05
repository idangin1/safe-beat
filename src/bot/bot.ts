import { Bot } from 'grammy';
import Redis from 'ioredis';
import { IUserStore } from '../user-store/store.interface';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { registerStartCommand } from './commands/start';
import { registerCityCommand } from './commands/city';
import { registerModeCommand } from './commands/mode';
import { registerStopCommand } from './commands/stop';
import { registerPlatformCommand } from './commands/platform';

export function createBot(token: string, redis: Redis, store: IUserStore, maxCommands: number): Bot {
  const bot = new Bot(token);

  bot.use(createRateLimitMiddleware(redis, maxCommands));

  registerStartCommand(bot, store);
  registerCityCommand(bot, store);
  registerModeCommand(bot, store);
  registerPlatformCommand(bot, store);
  registerStopCommand(bot, store);

  return bot;
}
