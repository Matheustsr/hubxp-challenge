// Configuração para testes - deve ser importado primeiro
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
