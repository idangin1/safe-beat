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
      alert.cities
          .filter(city => city.length > 0)
          .map((city) => this.store.getUsersByCity(city)),
    );
    logger.info('userSets', JSON.stringify(userSets[0]));

    // Deduplicate users (same user in multiple cities)
    const usersById = new Map(
      userSets.flat().map((u) => {logger.info(JSON.stringify(u)); return [u.telegramId, u]}),
    );
      logger.info('usersById', usersById.entries());

    const tasks = [...usersById.values()].map((user) =>
      this.limit(async () => {
        // Per-user dedup (multi-replica guard)
        const userClaimed = await this.dedup.claimUserAlert(alert.id, user.telegramId);
        if (!userClaimed) return;

        // Rate limit: one message per user per 120 seconds
        const rateLimitClaimed = await this.dedup.claimRateLimit(user.telegramId, 90);
        if (!rateLimitClaimed) {
          logger.debug('Rate limit hit, skipping user', { userId: user.telegramId });
          return;
        }

        const content = selectContent(user.mode ?? ['מצחיק'], user.platform ?? ['youtube']);
        logger.info('content selected', JSON.stringify(content))

        const city = alert.cities.find((c) => c.includes(user.city)) ?? alert.cities[0];
        logger.info('city', city)
        const text = formatAlertMessage(city, content.title, content.url);
        logger.info('alert message', text)

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
      `🎧 משהו שיעזור לכם לנשום בזמן האזעקה:\n` +
    `📍 מיקום: ${city}\n\n` +
    `נא להיכנס למרחב המוגן.\n\n` +
    `${mediaTitle}\n${mediaUrl}`
  );
}
