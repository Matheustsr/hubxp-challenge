import axios from 'axios';
import { logger } from '../logs/logger';
import { redis } from '../infra/redisClient';
import { backoff } from '../utils/retryBackoff';

export async function callLegacySystem(payload: any, idempotencyKey?: string) {
  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`);
    if (cached) {
      logger.info({ event: 'legacy_idempotent_hit', idempotencyKey });
      return JSON.parse(cached);
    }
  }

  const url = process.env.LEGACY_URL || 'http://legacy:4000/op';

  const maxRetries = 4;
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      const resp = await axios.post(url, payload, { timeout: 5000 });
      const result = resp.data;
      if (idempotencyKey) {
        await redis.set(`idem:${idempotencyKey}`, JSON.stringify(result), 'EX', 60 * 60);
      }
      return result;
    } catch (err) {
      if (attempt > maxRetries) {
        logger.error({ event: 'legacy_failed', attempt, err: (err as Error).message });
        throw err;
      }
      const waitMs = backoff(attempt);
      logger.warn({ event: 'legacy_retry', attempt, waitMs });
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}
