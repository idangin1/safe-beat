import { Bot } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import Redis from 'ioredis';
import { IUserStore } from '../user-store/store.interface';
import { BotContext } from './context';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { createOnboardingConversation } from './conversations/onboarding';
import { registerStartCommand } from './commands/start';
import { registerStopCommand } from './commands/stop';

export function createBot(token: string, redis: Redis, store: IUserStore, maxCommands: number): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  bot.use(conversations());
  bot.use(createConversation(createOnboardingConversation(store)));

  bot.use(createRateLimitMiddleware(redis, maxCommands));

  // Auto-launch onboarding for new users
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    const user = await store.getUser(ctx.from.id);
    if (!user) {
      await ctx.conversation.enter('onboarding');
      return;
    }
    return next();
  });

  registerStartCommand(bot, store);
  registerStopCommand(bot, store);

  return bot;
}
