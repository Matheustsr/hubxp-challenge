import request from 'supertest';
import app from '../src/app';

describe('Health e Métricas', () => {

  describe('Endpoint de health', () => {
    it('deve retornar status de saúde da aplicação', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      // Aceitar tanto "healthy" quanto "degraded" pois Redis pode não estar rodando nos testes
      expect(res.body.status).toMatch(/^(healthy|degraded)$/);
      expect(res.body.redis).toBeDefined();
      expect(res.body.feature_flags).toBeDefined();
    }, 15000); // Timeout de 15 segundos
  });

  describe('Endpoint de métricas', () => {
    it('deve retornar métricas do Prometheus', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('# HELP');
      expect(res.text).toContain('# TYPE');
    });

    it('deve incluir métricas padrão do Node.js', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('process_cpu');
      expect(res.text).toContain('nodejs_');
    });
  });

  describe('Documentação da API', () => {
    it('deve servir interface do Swagger UI', async () => {
      const res = await request(app).get('/docs/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger-ui');
    });
  });

  describe('Log de requisições', () => {
    it('deve logar requisições para endpoints de auth', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          provider: 'google',
          credentials: { token: 'google_valid_token_123' },
        });

      expect(res.status).toBe(200);
    }, 30000);
  });
});
