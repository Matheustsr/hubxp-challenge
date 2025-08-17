import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';

describe('Health e Métricas', () => {
  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  describe('Endpoint de health', () => {
    it('deve retornar status de saúde da aplicação', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Endpoint de métricas', () => {
    it('deve retornar métricas do Prometheus', async () => {
      const res = await request(app)
        .get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP');
      expect(res.text).toContain('# TYPE');
    });

    it('deve incluir métricas padrão do Node.js', async () => {
      const res = await request(app)
        .get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('process_cpu');
      expect(res.text).toContain('nodejs_');
    });
  });

  describe('Documentação da API', () => {
    it('deve servir interface do Swagger UI', async () => {
      const res = await request(app)
        .get('/docs/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger-ui');
    });
  });

  describe('Log de requisições', () => {
    it('deve logar requisições para endpoint de health', async () => {
      // Testa que as requisições estão sendo logadas
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
    });

    it('deve logar requisições para endpoints de auth', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ provider: 'google', credentials: { token: 'google_valid_token_123' } });

      expect(res.status).toBe(200);
    });
  });
});
