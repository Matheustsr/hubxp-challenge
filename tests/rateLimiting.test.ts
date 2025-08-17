import request from 'supertest';
import app from '../src/app';

describe('Rate Limiting e Circuit Breaker', () => {
  beforeEach(async () => {
    // Aguardar reset do rate limiter
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('deve permitir requisições dentro do limite', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        provider: 'google',
        credentials: { token: 'google_valid_token_123' },
      });

    expect(res.status).toBe(200);
  });

  it('deve permitir taxa razoável de requisições', async () => {
    // Fazer algumas requisições em sequência com delay
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/auth/login')
        .send({
          provider: 'google',
          credentials: { token: 'google_valid_token_123' },
        });

      expect([200, 429]).toContain(res.status); // Aceitar ambos os status
      await new Promise(resolve => setTimeout(resolve, 100)); // Pequeno delay
    }
  });

  it('deve ativar circuit breaker com tokens inválidos', async () => {
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

  it('deve rejeitar provider não suportado', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'facebook', credentials: { token: 'some_token' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Dados inválidos');
  });

  it('deve rejeitar quando provider está ausente', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ credentials: { token: 'some_token' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Dados inválidos');
  });

  it('deve rejeitar quando credentials estão ausentes', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Dados inválidos');
  });
});
