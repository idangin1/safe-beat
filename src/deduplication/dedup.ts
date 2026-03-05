import Redis from 'ioredis';

export class Deduplication {
  constructor(
    private readonly redis: Redis,
    private readonly alertTtl: number,
    private readonly userTtl: number,
  ) {}

  /**
   * Returns true if this alert is new (not yet processed).
   * Uses SET NX EX to atomically claim the alert.
   */
  async claimAlert(alertId: string): Promise<boolean> {
    const result = await this.redis.set(
      `dedup:alert:${alertId}`,
      '1',
      'EX',
      this.alertTtl,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Returns true if this user has not yet been notified for this alert.
   */
  async claimUserAlert(alertId: string, userId: number): Promise<boolean> {
    const result = await this.redis.set(
      `dedup:user:${alertId}:${userId}`,
      '1',
      'EX',
      this.userTtl,
      'NX',
    );
    return result === 'OK';
  }
}
