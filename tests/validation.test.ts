import request from 'supertest';
import app from '../src/app';
import { signJwt } from '../src/services/jwt.service';

// Mock Redis para evitar problemas de conexão
jest.mock('../src/infra/redisClient', () => ({
  redis: {
    disconnect: jest.fn()
  },
  getCachedToken: jest.fn().mockResolvedValue(null),
  cacheToken: jest.fn().mockResolvedValue(true)
}));

describe('Validação de Token', () => {
  it('deve validar um token JWT válido', async () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.payload.sub).toBe('test-user');
  });

  it('deve retornar resultado do cache quando token já foi validado', async () => {
    const { getCachedToken } = require('../src/infra/redisClient');
    getCachedToken.mockResolvedValueOnce({ sub: 'cached-user', provider: 'google', role: 'user' });

    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.payload.sub).toBe('cached-user'); // Do cache
  });

  it('deve rejeitar token JWT inválido', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('deve rejeitar quando header Authorization está ausente', async () => {
    const res = await request(app)
      .get('/auth/validate');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });

  it('deve rejeitar header Authorization com formato incorreto', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'InvalidFormat token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });

  it('deve rejeitar header Authorization sem prefixo Bearer', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'token-without-bearer');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });
});
