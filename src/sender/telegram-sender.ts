import { Api } from 'grammy';
import pRetry from 'p-retry';
import { logger } from '../logger';

interface TelegramError {
  error_code?: number;
  parameters?: { retry_after?: number };
  message?: string;
}

function isTelegramError(err: unknown): err is { payload: TelegramError } & Error {
  return err instanceof Error && 'payload' in err;
}

export class TelegramSender {
  constructor(
    private readonly bot: { api: Api },
    private readonly retryAttempts: number,
  ) {}

  async send(
    chatId: number,
    text: string,
    onBlocked?: (chatId: number) => Promise<void>,
  ): Promise<void> {
    await pRetry(
      async () => {
        await this.bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
      },
      {
        retries: this.retryAttempts,
        onFailedAttempt: async (error) => {
          if (!isTelegramError(error)) return;

          const code = error.payload?.error_code;

          if (code === 403) {
            // Bot was blocked — remove user, do not retry
            logger.info('Bot blocked by user, removing', { chatId });
            if (onBlocked) await onBlocked(chatId);
            throw new pRetry.AbortError('Bot blocked');
          }

          if (code === 429) {
            const retryAfter = error.payload?.parameters?.retry_after ?? 5;
            logger.warn('Telegram rate limit, waiting', { retryAfter, chatId });
            await new Promise((res) => setTimeout(res, retryAfter * 1000));
            return; // retry
          }

          logger.warn('Telegram send failed, will retry', {
            attempt: error.attemptNumber,
            message: error.message,
            chatId,
          });
        },
        factor: 2,
        minTimeout: 1000,
      },
    );
  }
}
