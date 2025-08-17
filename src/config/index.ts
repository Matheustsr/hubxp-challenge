function validateJwtSecret(secret: string): string {
  // Verificar se não é o valor padrão inseguro
  if (secret === 'alterar-isso-em-prod') {
    console.warn('JWT_SECRET usando valor padrão inseguro!');
    console.warn(
      '   Por favor, defina uma variável de ambiente JWT_SECRET com pelo menos 256 bits (32 caracteres)'
    );

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET padrão não é permitido em produção. Defina uma chave segura.'
      );
    }
  }

  return secret;
}

export default {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: validateJwtSecret(
    process.env.JWT_SECRET || 'alterar-isso-em-prod'
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  circuitBreaker: {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  },
  security: {
    jwtMinSecretLength: 32,
    jwtAlgorithm: 'HS256',
    tokenCacheTtl: 15 * 60, // 15 minutes
  },
};
