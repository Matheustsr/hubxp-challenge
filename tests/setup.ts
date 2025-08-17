// Setup global para testes
import { featureFlags } from '../src/config/featureFlags';

// Configurar environment variables para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super-secret-jwt-key-for-testing-only-32-chars';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.PORT = '3001';

// Feature flags para teste
process.env.FF_CIRCUIT_BREAKER = 'true';
process.env.FF_CACHE_TOKEN = 'true';
process.env.FF_RATE_LIMITING = 'true';
process.env.FF_METRICS = 'true';

// Configurar feature flags para testes
beforeAll(() => {
  // Habilitar todas as features por padrão nos testes
  featureFlags.setFlag('FF_CIRCUIT_BREAKER', true);
  featureFlags.setFlag('FF_CACHE_TOKEN', true);
  featureFlags.setFlag('FF_RATE_LIMITING', true);
  featureFlags.setFlag('FF_METRICS', true);
});

// Cleanup após cada teste
afterEach(() => {
  jest.clearAllMocks();
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
