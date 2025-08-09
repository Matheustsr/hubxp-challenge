export default {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'alterar-isso-em-prod', 
  jwtExpiresIn: '15m',
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME, 
    password: process.env.REDIS_PASSWORD
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
};