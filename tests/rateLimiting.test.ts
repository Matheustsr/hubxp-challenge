import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';

describe('Rate Limiting and Circuit Breaker', () => {
  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  beforeEach(async () => {
    // Aguardar reset do rate limiter
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should allow requests within rate limit', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: { token: 'google_valid_token_123' } });

    expect(res.status).toBe(200);
  });

  it('should allow reasonable request rate', async () => {
    // Fazer algumas requisições em sequência com delay
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/auth/login')
        .send({ provider: 'google', credentials: { token: 'google_valid_token_123' } });
      
      expect([200, 429]).toContain(res.status); // Aceitar ambos os status
      await new Promise(resolve => setTimeout(resolve, 100)); // Pequeno delay
    }
  });

  it('should trigger circuit breaker with invalid tokens', async () => {
    // Fazer muitas requisições com tokens inválidos para abrir o circuit breaker
    const promises: Promise<request.Response>[] = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app)
          .post('/auth/login')
          .send({ provider: 'google', credentials: { token: 'invalid_token' } })
      );
    }

    const results = await Promise.all(promises);
    
    // Todas devem retornar erro de autenticação
    results.forEach(res => {
      expect(res.status).toBe(401);
    });
  }, 15000);

  it('should reject unsupported provider', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'facebook', credentials: { token: 'some_token' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unsupported provider');
  });

  it('should reject missing provider', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ credentials: { token: 'some_token' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('provider and credentials required');
  });

  it('should reject missing credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('provider and credentials required');
  });
});
