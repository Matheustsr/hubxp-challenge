import Redis from 'ioredis';
import config from '../config';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

export async function cacheToken(token: string, payload: object, ttlSeconds = 60 * 15) {
  await redis.set(`jwt:${token}`, JSON.stringify(payload), 'EX', ttlSeconds);
}

export async function getCachedToken(token: string) {
  const v = await redis.get(`jwt:${token}`);
  return v ? JSON.parse(v) : null;
}
