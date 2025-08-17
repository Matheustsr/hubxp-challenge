import request from 'supertest';
import app from '../src/app';
import { signJwt } from '../src/services/jwt.service';
import { resetCircuitBreakers } from '../src/middleware/circuitBreaker';

describe('Auth Validate Tests', () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  describe('GET /auth/validate', () => {
    it('should return 401 without authorization header', async () => {
      const response = await request(app).get('/auth/validate').expect(401);

      expect(response.body).toEqual({
        error: 'missing_token',
        message: 'Token de autorização ausente ou inválido',
        details: [
          {
            field: 'authorization',
            message: 'Header Authorization com Bearer token é obrigatório',
          },
        ],
      });
    });

    it('should return 401 with invalid authorization header format', async () => {
      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', 'Invalid token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'missing_token',
        message: 'Token de autorização ausente ou inválido',
        details: [
          {
            field: 'authorization',
            message: 'Header Authorization com Bearer token é obrigatório',
          },
        ],
      });
    });

    it('should return 401 with invalid JWT token', async () => {
      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        valid: false,
        error: 'invalid_token',
        message: 'Token inválido ou expirado',
      });
    });

    it('should return 200 with valid JWT token', async () => {
      const payload = {
        sub: 'test-user',
        provider: 'google',
        role: 'user',
      };

      const token = signJwt(payload);

      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.payload).toMatchObject({
        sub: 'test-user',
        provider: 'google',
        role: 'user',
        iss: 'hubxp-auth',
        aud: 'hubxp-api',
      });
    });
  });
});
