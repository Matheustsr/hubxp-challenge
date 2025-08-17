import request from 'supertest';
import app from '../src/app';

describe('Fluxos de autenticação', () => {
  it('deve realizar login com token Google', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        provider: 'google',
        credentials: { token: 'google_valid_token_123' },
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('deve rejeitar token Google inválido', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: { token: 'bad' } });

    expect(res.status).toBe(401);
  });
});
