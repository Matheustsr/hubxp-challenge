import { redis } from '../src/infra/redisClient';

//isso aqui serve para limpar a conexão global do Redis após os testes
export default async () => {
  // Cleanup global Redis connection
  try {
    if (redis.status === 'ready') {
      await redis.quit();
    }
  } catch (error) {
    // Ignore cleanup errors
    console.log('Redis cleanup error (ignored):', (error as Error).message);
  }
};
