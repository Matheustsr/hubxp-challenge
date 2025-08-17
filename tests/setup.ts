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
