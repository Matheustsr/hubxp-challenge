import request from 'supertest';
import app from '../src/app';

describe('Auth flows', () => {
  it('should login with google mock token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        provider: 'google',
        credentials: { token: 'google_valid_token_123' },
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should reject invalid google token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ provider: 'google', credentials: { token: 'bad' } });

    expect(res.status).toBe(401);
  });
});
