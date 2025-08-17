import opossum from 'opossum';
import config from '../config';
import { logger } from '../logs/logger';
import { featureFlags } from '../config/featureFlags';
import { circuitBreakerStateGauge } from '../metrics/businessMetrics';

export function createBreaker(
  fn: (...args: any[]) => Promise<any>,
  name = 'breaker'
) {
  // Se feature flag estiver desabilitada, retorna uma função que apenas executa o original
  if (!featureFlags.isEnabled('FF_CIRCUIT_BREAKER')) {
    logger.info({ event: 'circuit_breaker_disabled', name });
    return {
      fire: fn,
      on: () => {},
      stats: {
        fires: 0,
        cacheHits: 0,
        successes: 0,
        failures: 0,
        rejects: 0,
        timeouts: 0,
        cacheVolume: 0,
        rollingCountBuckets: 0,
        rollingCountTimeout: 0,
        rollingCountFailure: 0,
        rollingCountSuccess: 0,
        rollingCountSemaphoreRejected: 0,
        rollingCountShortCircuited: 0,
        rollingPercent: 0,
        isCircuitBreakerOpen: false,
      },
    };
  }

  const breaker = new opossum(fn, {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
  });

  // Atualizar métricas de estado do circuit breaker
  const updateStateMetric = (state: 'open' | 'halfOpen' | 'close') => {
    if (featureFlags.isEnabled('FF_METRICS')) {
      const stateValue = state === 'close' ? 0 : state === 'halfOpen' ? 1 : 2;
      circuitBreakerStateGauge.set({ service: name }, stateValue);
    }
  };

  breaker.on('open', () => {
    logger.warn({ event: 'circuit_open', name });
    updateStateMetric('open');
  });

  breaker.on('halfOpen', () => {
    logger.info({ event: 'circuit_half_open', name });
    updateStateMetric('halfOpen');
  });

  breaker.on('close', () => {
    logger.info({ event: 'circuit_close', name });
    updateStateMetric('close');
  });

  breaker.on('fallback', () =>
    logger.info({ event: 'circuit_fallback', name })
  );

  // Inicializar métrica como fechado
  updateStateMetric('close');

  return breaker;
}
