import opossum from 'opossum';
import config from '../config';
import { logger } from '../logs/logger';
import { featureFlags } from '../config/featureFlags';
import { circuitBreakerStateGauge } from '../metrics/businessMetrics';

// Interface básica para circuit breakers
interface CircuitBreaker {
  opened?: boolean;
  close?: () => void;
  stats?: {
    failures: number;
    successes: number;
    fires: number;
  };
}

// Array para armazenar instâncias dos circuit breakers
const circuitBreakers: CircuitBreaker[] = [];

export function createBreaker<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  name = 'breaker'
) {
  // Se feature flag estiver desabilitada, retorna uma função que apenas executa o original
  if (!featureFlags.isEnabled('FF_CIRCUIT_BREAKER')) {
    logger.info({ event: 'circuit_breaker_disabled', name });
    const mockBreaker = {
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
    circuitBreakers.push(mockBreaker);
    return mockBreaker;
  }

  const breaker = new opossum(fn, {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
  });

  // Adicionar à lista de circuit breakers
  circuitBreakers.push(breaker);

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

  // Adicionar ao store de circuit breakers
  circuitBreakers.push(breaker);

  return breaker;
}

// Função para resetar todos os circuit breakers
export function resetCircuitBreakers() {
  circuitBreakers.forEach((breaker) => {
    try {
      if (breaker.opened) {
        breaker.close?.();
      }
      // Limpar estatísticas se possível
      if (breaker.stats) {
        breaker.stats.failures = 0;
        breaker.stats.successes = 0;
        breaker.stats.fires = 0;
      }
    } catch (error) {
      // Ignorar erros de reset
    }
  });
}
