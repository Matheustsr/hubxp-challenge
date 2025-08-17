import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';

describe('Autenticação Google', () => {
  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  it('deve fazer login com token Google válido', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: { token: 'google_valid_token_123' } });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('deve rejeitar token Google inválido', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: { token: 'bad' } });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('deve rejeitar credenciais Google vazias', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: {} });

    expect(res.status).toBe(401);
  });

  it('deve rejeitar token Google com formato incorreto', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: { token: '' } });

    expect(res.status).toBe(401);
  });
});
