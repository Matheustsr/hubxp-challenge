import axios from 'axios';
import { logger } from '../logs/logger';
import { redis } from '../infra/redisClient';
import { backoff } from '../utils/retryBackoff';

export async function callLegacySystem(
  payload: unknown,
  idempotencyKey?: string
) {
  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`);
    if (cached) {
      logger.info({ event: 'legacy_idempotent_hit', idempotencyKey });
      return JSON.parse(cached);
    }
  }

  const url = process.env.LEGACY_URL || 'http://legacy:4000/op';

  /*  escolhi 4 porque é um valor razoável para a maioria dos casos de uso, permitindo várias tentativas sem tornar o processo muito lento.
   * O número de tentativas pode ser ajustado conforme necessário, mas 4 é um bom ponto de partida para lidar com erros transitórios comuns, como problemas de rede ou sobrecarga do servidor.
   * Isso permite que o sistema se recupere de falhas temporárias sem causar atrasos significativos na resposta do usuário.
   * Além disso, 4 tentativas é um compromisso entre garantir uma chance razoável de sucesso e evitar que o sistema fique preso em um loop de tentativas excessivas.
   * Se o sistema legado estiver consistentemente indisponível, é melhor falhar rapidamente e notificar o usuário
   * do que continuar tentando indefinidamente, o que poderia levar a uma má experiência do
   */
  const maxRetries = 4;
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt < maxRetries) {
    try {
      attempt++;
      const resp = await axios.post(url, payload, { timeout: 5000 });
      const result = resp.data;
      if (idempotencyKey) {
        await redis.set(
          `idem:${idempotencyKey}`,
          JSON.stringify(result),
          'EX',
          60 * 60
        );
      }
      return result;
    } catch (err: unknown) {
      lastError = err as Error;
      const isRetryableError = shouldRetry(err);

      if (attempt >= maxRetries || !isRetryableError) {
        logger.error({
          event: 'legacy_failed',
          attempt,
          statusCode: (err as any).response?.status,
          isRetryable: isRetryableError,
          err: (err as Error).message,
        });
        throw err;
      }

      const waitMs = backoff(attempt);
      logger.warn({
        event: 'legacy_retry',
        attempt,
        statusCode: (err as any).response?.status,
        waitMs,
      });
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  // Se chegou aqui, esgotou tentativas sem sucesso
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Determina se um erro deve ser reantado.
 * Retenta apenas erros transitórios (5xx/network), nunca 4xx.
 */
function shouldRetry(err: unknown): boolean {
  // Erros de rede (sem resposta HTTP)
  if (!(err as any).response) {
    return true;
  }

  const statusCode = (err as any).response.status;

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
