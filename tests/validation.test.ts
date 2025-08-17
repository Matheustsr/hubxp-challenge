import request from 'supertest';
import app from '../src/app';
import { signJwt } from '../src/services/jwt.service';

// Mock Redis to avoid connection issues
jest.mock('../src/infra/redisClient', () => ({
  redis: {
    disconnect: jest.fn()
  },
  getCachedToken: jest.fn().mockResolvedValue(null),
  cacheToken: jest.fn().mockResolvedValue(true)
}));

describe('Token Validation', () => {
  it('should validate a valid JWT token', async () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.payload.sub).toBe('test-user');
  });

  it('should return cached token validation result', async () => {
    const { getCachedToken } = require('../src/infra/redisClient');
    getCachedToken.mockResolvedValueOnce({ sub: 'cached-user', provider: 'google', role: 'user' });

    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.payload.sub).toBe('cached-user'); // From cache
  });

  it('should reject invalid JWT token', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('should reject missing Authorization header', async () => {
    const res = await request(app)
      .get('/auth/validate');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });

  it('should reject malformed Authorization header', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'InvalidFormat token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });

  it('should reject Authorization header without Bearer prefix', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'token-without-bearer');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });
});
