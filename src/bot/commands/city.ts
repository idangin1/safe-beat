import { CommandContext, Context } from 'grammy';
import { IUserStore } from '../../user-store/store.interface';

const cities: string[] = require('../../../data/cities.json') as string[];
const citySet = new Set(cities.map((c) => c.toLowerCase().trim()));

export function registerCityCommand(
  bot: { command: (cmd: string, handler: (ctx: CommandContext<Context>) => Promise<void>) => void },
  store: IUserStore,
): void {
  bot.command('city', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const input = ctx.match?.trim().toLowerCase();
    if (!input) {
      await ctx.reply('📍 שלחו: /city &lt;שם עיר&gt;\nדוגמה: /city tel aviv', { parse_mode: 'HTML' });
      return;
    }

    if (!citySet.has(input)) {
      await ctx.reply(
        `❌ העיר "<b>${input}</b>" לא נמצאה ברשימה.\nנסו שם אחר.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const existing = await store.getUser(from.id);
    if (!existing) {
      await ctx.reply('⚠️ נא להתחיל עם /start תחילה.');
      return;
    }

    // Remove from old city index
    if (existing.city && existing.city !== input) {
      await store.removeUserFromCity(from.id, existing.city);
    }

    existing.city = input;
    existing.chatId = ctx.chat.id;
    await store.saveUser(existing);
    await store.addUserToCity(from.id, input);

    await ctx.reply(`✅ העיר שלך עודכנה ל: <b>${input}</b>`, { parse_mode: 'HTML' });
  });
}
