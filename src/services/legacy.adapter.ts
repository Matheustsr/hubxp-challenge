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
    } catch (err: any) {
      const isRetryableError = shouldRetry(err);
      
      if (attempt > maxRetries || !isRetryableError) {
        logger.error({ 
          event: 'legacy_failed', 
          attempt, 
          statusCode: err.response?.status,
          isRetryable: isRetryableError,
          err: err.message 
        });
        throw err;
      }
      
      const waitMs = backoff(attempt);
      logger.warn({ 
        event: 'legacy_retry', 
        attempt, 
        statusCode: err.response?.status,
        waitMs 
      });
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

/**
 * Determina se um erro deve ser reantado.
 * Retenta apenas erros transitórios (5xx/network), nunca 4xx.
 */
function shouldRetry(err: any): boolean {
  // Erros de rede (sem resposta HTTP)
  if (!err.response) {
    return true;
  }
  
  const statusCode = err.response.status;
  
  // 4xx são erros do cliente - não retentar
  if (statusCode >= 400 && statusCode < 500) {
    return false;
  }
  
  // 5xx são erros do servidor - retentar
  if (statusCode >= 500) {
    return true;
  }
  
  // Outros códigos não esperados - não retentar por segurança
  return false;
}
