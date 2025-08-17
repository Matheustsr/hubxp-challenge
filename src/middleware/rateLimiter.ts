import rateLimit from 'express-rate-limit';
import config from '../config';
import { featureFlags } from '../config/featureFlags';
import { rateLimitRejectionsTotal } from '../metrics/businessMetrics';
import { logger } from '../logs/logger';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: _req => {
    // Se feature flag estiver desabilitada, pula o rate limiting
    return !featureFlags.isEnabled('FF_RATE_LIMITING');
  },
  handler: (_req, res) => {
    const endpoint = _req.route?.path || _req.path;

    // Incrementar métrica de rate limit rejections
    if (featureFlags.isEnabled('FF_METRICS')) {
      rateLimitRejectionsTotal.inc({ route: endpoint });
    }

    logger.warn({
      event: 'rate_limit_exceeded',
      ip: _req.ip,
      endpoint,
      userAgent: _req.get('user-agent'),
    });

    res.status(429).json({
      error: 'too_many_requests',
      message: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: Math.round(config.rateLimit.windowMs / 1000),
    });
  },
});
