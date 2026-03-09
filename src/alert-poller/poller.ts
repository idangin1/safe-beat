import { EventEmitter } from 'events';
import { config } from '../config/env';
import axios from 'axios';
import { createHash } from 'crypto';
import { NormalizedAlert, RawAlert } from '../types';
import { logger } from '../logger';

export class AlertPoller extends EventEmitter {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastResponseJson = '';

  constructor(
    private readonly apiUrl: string,
    private readonly intervalMs: number,
  ) {
    super();
  }

  start(): void {
    logger.info('Starting alert poller', { intervalMs: this.intervalMs });
    this.intervalHandle = setInterval(() => {
      this.poll().catch((err: unknown) => {
        logger.warn('Poll error', { error: err instanceof Error ? err.message : err });
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async poll(): Promise<void> {
    const response = await axios.get<RawAlert | RawAlert[]>(this.apiUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'SafeBeat/1.0' },
    });

    const currentJson = JSON.stringify(response.data);
    if (config.NODE_ENV === 'production') {
      logger.info('Current data: ' + JSON.stringify(currentJson));
    }

    // In-memory change detection — skip Redis entirely when quiet
    if (currentJson === this.lastResponseJson) return;
    this.lastResponseJson = currentJson;

    const rawAlerts = Array.isArray(response.data)
      ? response.data
      : [response.data];

    for (const raw of rawAlerts) {
      if (raw.title !== 'ירי רקטות וטילים' || raw.data?.length === 0) continue;

      const normalized = this.normalize(raw);
      this.emit('alert', normalized);
    }
  }

  private normalize(raw: RawAlert): NormalizedAlert {
    const cities = raw.data!.sort();

    const receivedAt = Date.now();
    const hashInput = cities.join(',') + ':' + receivedAt;
    const id = createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

    return {
      id,
      cities,
      title: raw.title,
      receivedAt,
    };
  }
}
