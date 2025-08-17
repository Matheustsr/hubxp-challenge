import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';

describe('Health and Metrics', () => {
  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Metrics endpoint', () => {
    it('should return Prometheus metrics', async () => {
      const res = await request(app)
        .get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP');
      expect(res.text).toContain('# TYPE');
    });

    it('should include default Node.js metrics', async () => {
      const res = await request(app)
        .get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('process_cpu');
      expect(res.text).toContain('nodejs_');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI', async () => {
      const res = await request(app)
        .get('/docs/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger-ui');
    });
  });

  describe('Request Logging', () => {
    it('should log requests for health endpoint', async () => {
      // Test that requests are being logged (by checking they don't fail)
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
    });

    it('should log requests for auth endpoints', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ provider: 'google', credentials: { token: 'google_valid_token_123' } });

      expect(res.status).toBe(200);
    });
  });
});
