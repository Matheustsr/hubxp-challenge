import Redis from 'ioredis';
import config from '../config';

export const redis = new Redis({
  host: config.redis.host,
  username: config.redis.username,
  password: config.redis.password,
  port: config.redis.port,
});

// Funções antigas para compatibilidade (deprecated)
export async function cacheToken(token: string, payload: object, ttlSeconds = 60 * 15) {
  await redis.set(`jwt:${token}`, JSON.stringify(payload), 'EX', ttlSeconds);
}

export async function getCachedToken(token: string) {
  const v = await redis.get(`jwt:${token}`);
  return v ? JSON.parse(v) : null;
}

// Novas funções baseadas em JTI para melhor segurança
export async function cacheTokenByJti(jti: string, payload: object, ttlSeconds = 60 * 15) {
  await redis.set(`jti:${jti}`, JSON.stringify(payload), 'EX', ttlSeconds);
}

export async function getCachedTokenByJti(jti: string) {
  const v = await redis.get(`jti:${jti}`);
  if (v === null) return null;
  if (v === 'REVOKED') return 'REVOKED';
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export async function revokeTokenByJti(jti: string) {
  // Marcar como revogado ao invés de deletar, para auditoria
  await redis.set(`jti:${jti}`, 'REVOKED', 'EX', 60 * 60 * 24); // Manter por 24h para auditoria
}

export async function cleanupExpiredTokens() {
  // Função auxiliar para limpeza de tokens expirados
  // Pode ser chamada por um job schedulado
  const cursor = '0';
  const pattern = 'jti:*';
  const keys = await redis.keys(pattern);
  
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      // Chave sem TTL, definir um para limpeza
      await redis.expire(key, 60 * 60 * 24);
    }
  }
}
