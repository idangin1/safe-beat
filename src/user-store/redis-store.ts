import Redis from 'ioredis';
import { User } from '../types';
import { IUserStore } from './store.interface';
import { logger } from '../logger';

export class RedisUserStore implements IUserStore {
  constructor(private readonly redis: Redis) {}

  async saveUser(user: User): Promise<void> {
    await this.redis.set(`user:${user.telegramId}`, JSON.stringify(user));
  }

  async getUser(telegramId: number): Promise<User | null> {
    const raw = await this.redis.get(`user:${telegramId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      logger.warn('Failed to parse user from Redis', { telegramId });
      return null;
    }
  }

  async deleteUser(telegramId: number): Promise<void> {
    const user = await this.getUser(telegramId);
    if (user?.city) {
      await this.removeUserFromCity(telegramId, user.city);
    }
    await this.redis.del(`user:${telegramId}`);
  }

  async getUsersByCity(city: string): Promise<User[]> {
    const telegramIds = await this.redis.smembers(`city:${city}`);
    if (telegramIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of telegramIds) {
      pipeline.get(`user:${id}`);
    }

    const results = await pipeline.exec();
    const users: User[] = [];

    if (!results) return users;

    for (const [err, raw] of results) {
      if (err || !raw) continue;
      try {
        const user = JSON.parse(raw as string) as User;
        if (user.active) users.push(user);
      } catch {
        logger.warn('Failed to parse user in getUsersByCity');
      }
    }

    return users;
  }

  async addUserToCity(telegramId: number, city: string): Promise<void> {
    await this.redis.sadd(`city:${city}`, telegramId.toString());
  }

  async removeUserFromCity(telegramId: number, city: string): Promise<void> {
    await this.redis.srem(`city:${city}`, telegramId.toString());
  }
}
