import { BotContext } from '../context';
import { IUserStore } from '../../user-store/store.interface';

export function registerStopCommand(
  bot: { command: (cmd: string, handler: (ctx: BotContext) => Promise<void>) => void },
  store: IUserStore,
): void {
  bot.command('stop', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const existing = await store.getUser(from.id);
    if (existing) {
      existing.active = false;
      await store.saveUser(existing);
    }

    await ctx.reply('👋 הפסקת קבלת הודעות. נתראה בשלום.');
  });
}
