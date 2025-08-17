import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
export const register = new Registry();
collectDefaultMetrics({ register });

export const authAttemptsTotal = new Counter({
  name: 'auth_attempts_total',
  help: 'Auth attempts',
  labelNames: ['provider', 'status'],
  registers: [register],
});

export const authSuccessTotal = new Counter({
  name: 'auth_success_total',
  help: 'Auth success',
  labelNames: ['provider'],
  registers: [register],
});

export const authFailTotal = new Counter({
  name: 'auth_fail_total',
  help: 'Auth fail',
  labelNames: ['provider', 'reason'],
  registers: [register],
});

export const tokenValidationTotal = new Counter({
  name: 'token_validation_total',
  help: 'Token validations',
  labelNames: ['status'],
  registers: [register],
});

export const cacheHitTotal = new Counter({
  name: 'cache_hit_total',
  help: 'Cache hits',
  labelNames: ['type', 'status'],
  registers: [register],
});

export const cacheMissTotal = new Counter({
  name: 'cache_miss_total',
  help: 'Cache miss',
  labelNames: ['type'],
  registers: [register],
});

export const rateLimitRejectionsTotal = new Counter({
  name: 'rate_limit_rejections_total',
  help: '429s',
  labelNames: ['route'],
  registers: [register],
});

export const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: '0=closed,1=half_open,2=open',
  labelNames: ['service'],
  registers: [register],
});
