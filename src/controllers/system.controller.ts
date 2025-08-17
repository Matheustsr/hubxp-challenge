import { Request, Response } from 'express';
import { register } from '../metrics/businessMetrics';
import { redis } from '../infra/redisClient';
import { featureFlags } from '../config/featureFlags';
import { logger } from '../logs/logger';

/**
 * GET /health
 * Health check endpoint com status do Redis e feature flags
 */
export async function healthCheck(_req: Request, res: Response) {
  try {
    // Ping ao Redis com timeout curto pra não travar health
    const pingWithTimeout = async (ms: number) => {
      try {
        const timeout = new Promise<null>(resolve =>
          setTimeout(() => resolve(null), ms)
        );
        const pong = (await Promise.race([redis.ping(), timeout])) as
          | string
          | null;
        return pong === 'PONG';
      } catch {
        return false;
      }
    };

    const redisOk = await pingWithTimeout(300);
    const status = redisOk ? 'ok' : 'degraded';

    res.status(redisOk ? 200 : 503).json({
      status,
      redis: redisOk,
      feature_flags: {
        rate_limiting: featureFlags.isEnabled('FF_RATE_LIMITING'),
        metrics: featureFlags.isEnabled('FF_METRICS'),
        circuit_breaker: featureFlags.isEnabled('FF_CIRCUIT_BREAKER'),
        cache_token: featureFlags.isEnabled('FF_CACHE_TOKEN'),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'health_check_error');
    res.status(503).json({
      status: 'error',
      redis: false,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /metrics
 * Endpoint de métricas Prometheus
 */
export async function getMetrics(_req: Request, res: Response) {
  if (!featureFlags.isEnabled('FF_METRICS')) {
    return res.status(404).json({ error: 'metrics_disabled' });
  }

  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error({ err }, 'metrics_error');
    res.status(500).send('# metrics error');
  }
}
