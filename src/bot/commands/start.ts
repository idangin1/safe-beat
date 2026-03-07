import { BotContext } from '../context';

export function registerStartCommand(
  bot: { command: (cmd: string, handler: (ctx: BotContext) => Promise<void>) => void },
  _store: unknown,
): void {
  bot.command('start', async (ctx) => {
    await ctx.conversation.enter('onboarding');
  });
}
