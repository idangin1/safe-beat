import { CommandContext, Context } from 'grammy';
import { ContentPlatform } from '../../types';
import { IUserStore } from '../../user-store/store.interface';

const platformMap: Record<string, ContentPlatform> = {
  'יוטיוב': 'youtube',
  'youtube': 'youtube',
  'ספוטיפיי': 'spotify',
  'spotify': 'spotify',
};

const platformLabels: Record<ContentPlatform, string> = {
  youtube: 'יוטיוב',
  spotify: 'ספוטיפיי',
};

export function registerPlatformCommand(
  bot: { command: (cmd: string, handler: (ctx: CommandContext<Context>) => Promise<void>) => void },
  store: IUserStore,
): void {
  bot.command('platform', async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const input = ctx.match?.trim().toLowerCase();

    if (!input || !platformMap[input]) {
      await ctx.reply(
        `📺 בחרו פלטפורמה:\n` +
        `/platform יוטיוב — קישורים מיוטיוב\n` +
        `/platform ספוטיפיי — קישורים מספוטיפיי`,
      );
      return;
    }

    const existing = await store.getUser(from.id);
    if (!existing) {
      await ctx.reply('⚠️ נא להתחיל עם /start תחילה.');
      return;
    }

    existing.platform = platformMap[input];
    await store.saveUser(existing);

    await ctx.reply(
      `✅ פלטפורמה עודכנה ל: <b>${platformLabels[existing.platform]}</b>`,
      { parse_mode: 'HTML' },
    );
  });
}
