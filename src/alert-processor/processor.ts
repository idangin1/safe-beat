import pLimit from 'p-limit';
import { NormalizedAlert } from '../types';
import { IUserStore } from '../user-store/store.interface';
import { Deduplication } from '../deduplication/dedup';
import { selectContent } from '../content-selector/selector';
import { TelegramSender } from '../sender/telegram-sender';
import { logger } from '../logger';

export class AlertProcessor {
  private readonly limit: ReturnType<typeof pLimit>;

  constructor(
    private readonly store: IUserStore,
    private readonly dedup: Deduplication,
    private readonly sender: TelegramSender,
    concurrency: number,
  ) {
    this.limit = pLimit(concurrency);
  }

  async process(alert: NormalizedAlert): Promise<void> {
    // Alert-level dedup
    const claimed = await this.dedup.claimAlert(alert.id);
    if (!claimed) {
      logger.debug('Alert already processed, skipping', { alertId: alert.id });
      return;
    }

    logger.info('Processing alert', { alertId: alert.id, cities: alert.cities });

    // Gather all users subscribed to affected cities
    const userSets = await Promise.all(
      alert.cities.map((city) => this.store.getUsersByCity(city)),
    );

    // Deduplicate users (same user in multiple cities)
    const usersById = new Map(
      userSets.flat().map((u) => [u.telegramId, u]),
    );

    const tasks = [...usersById.values()].map((user) =>
      this.limit(async () => {
        // Per-user dedup (multi-replica guard)
        const userClaimed = await this.dedup.claimUserAlert(alert.id, user.telegramId);
        if (!userClaimed) return;

        const content = selectContent(user.mode, user.platform ?? 'youtube');

        const city = alert.cities.find((c) => c.includes(user.city)) ?? alert.cities[0];
        const text = formatAlertMessage(city, content.title, content.url);

        await this.sender.send(user.chatId, text, async () => {
          // Bot was blocked — soft-delete user
          await this.store.deleteUser(user.telegramId);
        });
      }),
    );

    await Promise.allSettled(tasks);
    logger.info('Alert processed', { alertId: alert.id, recipients: usersById.size });
  }
}

function formatAlertMessage(city: string, mediaTitle: string, mediaUrl: string): string {
  return (
    `🚨 <b>אזעקה באזורכם</b>\n\n` +
    `📍 מיקום: ${city}\n\n` +
    `נא להיכנס למרחב המוגן.\n\n` +
    `🎧 משהו שיעזור לכם לנשום:\n` +
    `${mediaTitle}\n${mediaUrl}`
  );
}
