import { redis } from '../src/infra/redisClient';

//isso aqui serve para limpar a conexão global do Redis após os testes
export default async () => {
  // Cleanup global Redis connection
  try {
    await redis.quit();
  } catch (error) {
    // Ignore cleanup errors
  }
};
