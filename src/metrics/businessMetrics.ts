import promClient from 'prom-client';

// Contadores de autenticação
export const authAttemptsTotal = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['provider', 'status']
});

export const authSuccessTotal = new promClient.Counter({
  name: 'auth_success_total',
  help: 'Total number of successful authentications',
  labelNames: ['provider']
});

export const authFailTotal = new promClient.Counter({
  name: 'auth_fail_total',
  help: 'Total number of failed authentications',
  labelNames: ['provider', 'reason']
});

// Cache hits
export const cacheHitTotal = new promClient.Counter({
  name: 'cache_hit_total',
  help: 'Total number of cache hits',
  labelNames: ['type', 'status'] // type: token_validation, hit/miss
});

// Gauge para estado dos circuit breakers
export const circuitBreakerStateGauge = new promClient.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['service']
});

// Rate limiting metrics
export const rateLimitRejectionsTotal = new promClient.Counter({
  name: 'rate_limit_rejections_total',
  help: 'Total number of requests rejected by rate limiter',
  labelNames: ['endpoint']
});

// Token validation metrics
export const tokenValidationTotal = new promClient.Counter({
  name: 'token_validation_total',
  help: 'Total number of token validations',
  labelNames: ['status'] // valid, invalid, expired
});

// Registrar todas as métricas
promClient.register.registerMetric(authAttemptsTotal);
promClient.register.registerMetric(authSuccessTotal);
promClient.register.registerMetric(authFailTotal);
promClient.register.registerMetric(cacheHitTotal);
promClient.register.registerMetric(circuitBreakerStateGauge);
promClient.register.registerMetric(rateLimitRejectionsTotal);
promClient.register.registerMetric(tokenValidationTotal);
