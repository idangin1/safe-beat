import Fastify from 'fastify';
import { logger } from '../logger';

export function createHealthServer(port: number) {
  const app = Fastify({ logger: false });

  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok' });
  });

  app.get('/metrics', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  const start = async (): Promise<void> => {
    await app.listen({ port, host: '0.0.0.0' });
    logger.info('Health server listening', { port });
  };

  const stop = async (): Promise<void> => {
    await app.close();
  };

  return { start, stop };
}
