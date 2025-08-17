import { redis } from '../src/infra/redisClient';

// Isso aqui serve para limpar a conexão global do Redis após os testes
export default async () => {
  // Cleanup global Redis connection
  try {
    if (redis && typeof redis.quit === 'function') {
      await redis.quit();
    }
  } catch (error) {
    // Ignore cleanup errors em testes
  }
};
