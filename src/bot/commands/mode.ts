import { CommandContext, Context } from 'grammy';
import { ContentMode } from '../../types';
import { IUserStore } from '../../user-store/store.interface';

const modeLabels: Record<ContentMode, string> = {
  מרגיע: 'מרגיע',
  מצחיק: 'מצחיק',
  ילדים: 'ילדים',
};

export function registerModeCommand(
  bot: { command: (cmd: string, handler: (ctx: CommandContext<Context>) => Promise<void>) => void },
  store: IUserStore,
): void {
  bot.command('mode', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const input = ctx.match?.trim().toLowerCase() as ContentMode | undefined;

    if (!input || !Object.values(modeLabels).includes(input)) {
      await ctx.reply(
        `🎵 בחרו סוג תוכן:\n` +
        `/mode מרגיע — מוזיקה מרגיעה\n` +
        `/mode מצחיק — תוכן מצחיק\n` +
        `/mode ילדים — תוכן לילדים`,
      );
      return;
    }

    const existing = await store.getUser(from.id);
    if (!existing) {
      await ctx.reply('⚠️ נא להתחיל עם /start תחילה.');
      return;
    }

    existing.mode = input;
    await store.saveUser(existing);

    await ctx.reply(
      `✅ מצב תוכן עודכן ל: <b>${input}</b>`,
      { parse_mode: 'HTML' },
    );
  });
}
