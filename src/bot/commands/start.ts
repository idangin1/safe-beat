import { CommandContext, Context } from 'grammy';
import { IUserStore } from '../../user-store/store.interface';
import { User } from '../../types';

export function registerStartCommand(bot: { command: (cmd: string, handler: (ctx: CommandContext<Context>) => Promise<void>) => void }, store: IUserStore): void {
  bot.command('start', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const existing = await store.getUser(from.id);

    const user: User = {
      telegramId: from.id,
      chatId: ctx.chat.id,
      city: existing?.city ?? '',
      mode: existing?.mode ?? 'calm',
      platform: existing?.platform ?? 'youtube',
      subscribedAt: existing?.subscribedAt ?? Date.now(),
      active: true,
      username: from.username,
    };

    await store.saveUser(user);

    await ctx.reply(
      `🛡️ <b>ברוכים הבאים ל-SafeBeat!</b>\n\n` +
      `אני אשלח לכם תוכן מרגיע בזמן אזעקה.\n\n` +
      `<b>הגדרות:</b>\n` +
      `/city &lt;שם עיר&gt; — בחרו את העיר שלכם\n` +
      `/mode מרגיע|מצחיק|ילדים — בחרו סוג תוכן\n` +
      `/platform יוטיוב|ספוטיפיי — בחרו פלטפורמה\n` +
      `/stop — הפסקת קבלת הודעות`,
      { parse_mode: 'HTML' },
    );
  });
}
