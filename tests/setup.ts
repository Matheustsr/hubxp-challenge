// Setup global para testes
// Configurar environment variables para testes ANTES de qualquer import
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'hub-xp-test-secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.PORT = '3001';

// Feature flags para teste
process.env.FF_CIRCUIT_BREAKER = 'true';
process.env.FF_CACHE_TOKEN = 'true';
process.env.FF_RATE_LIMITING = 'true';
process.env.FF_METRICS = 'true';

// Mock do Redis para evitar dependência de instância real em testes
jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => {
    const data = new Map<string, { value: string; expireAt?: number }>();

    return {
      get: jest.fn((key: string) => {
        const item = data.get(key);
        if (!item) return Promise.resolve(null);

        // Verificar se expirou
        if (item.expireAt && Date.now() > item.expireAt) {
          data.delete(key);
          return Promise.resolve(null);
        }

        return Promise.resolve(item.value);
      }),

      set: jest.fn(
        (key: string, value: string, mode?: string, duration?: number) => {
          const item: { value: string; expireAt?: number } = { value };

          if (mode === 'EX' && duration) {
            item.expireAt = Date.now() + duration * 1000;
          }

          data.set(key, item);
          return Promise.resolve('OK');
        }
      ),

      keys: jest.fn((pattern: string) => {
        const keys = Array.from(data.keys());
        if (pattern === '*') return Promise.resolve(keys);

        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Promise.resolve(keys.filter(key => regex.test(key)));
      }),

      ttl: jest.fn((key: string) => {
        const item = data.get(key);
        if (!item) return Promise.resolve(-2);
        if (!item.expireAt) return Promise.resolve(-1);

        const remainingMs = item.expireAt - Date.now();
        return Promise.resolve(Math.ceil(remainingMs / 1000));
      }),

      expire: jest.fn((key: string, seconds: number) => {
        const item = data.get(key);
        if (!item) return Promise.resolve(0);

        item.expireAt = Date.now() + seconds * 1000;
        return Promise.resolve(1);
      }),

      quit: jest.fn(() => {
        data.clear();
        return Promise.resolve('OK');
      }),

      ping: jest.fn(() => Promise.resolve('PONG')),

      status: 'ready',
    };
  });

  return MockRedis;
});

// Mock console methods para evitar spam nos testes
global.console = {
  ...console,
  // Deixar log e error para debugging quando necessário
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
