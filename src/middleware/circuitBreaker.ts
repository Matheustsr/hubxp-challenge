import opossum from 'opossum';
import config from '../config';
import { logger } from '../logs/logger';

export function createBreaker(fn: (...args: any[]) => Promise<any>, name = 'breaker') {
  const breaker = new opossum(fn, {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
  });

  breaker.on('open', () => logger.warn({ event: 'circuit_open', name }));
  breaker.on('halfOpen', () => logger.info({ event: 'circuit_half_open', name }));
  breaker.on('close', () => logger.info({ event: 'circuit_close', name }));
  breaker.on('fallback', () => logger.info({ event: 'circuit_fallback', name }));

  return breaker;
}
