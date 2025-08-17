import request from 'supertest';
import app from '../src/app';
import { featureFlags } from '../src/config/featureFlags';

describe('Rate Limiter Tests', () => {
  beforeAll(() => {
    // Garantir que rate limiting está habilitado
    featureFlags.setFlag('FF_RATE_LIMITING', true);
  });

  afterAll(() => {
    // Restaurar estado original
    featureFlags.setFlag('FF_RATE_LIMITING', true);
  });

  it('should return 429 when rate limit is exceeded', async () => {
    // Fazer muitas requisições rapidamente para exceder o rate limit
    const responses: any[] = [];

    for (let i = 0; i < 105; i++) {
      // Exceder o limite de 100 req/min
      const response = await request(app)
        .post('/auth/login')
        .send({
          provider: 'google',
          credentials: { token: 'test-token' },
        });
      responses.push(response);
    }

    // Pelo menos algumas requisições devem retornar 429
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // Verificar a resposta do rate limit
    const rateLimitResponse = rateLimitedResponses[0];
    expect(rateLimitResponse.body.error).toBe('too_many_requests');
    expect(rateLimitResponse.body.message).toBe(
      'Muitas requisições. Tente novamente mais tarde.'
    );
    expect(typeof rateLimitResponse.body.retryAfter).toBe('number');
  }, 30000); // Timeout maior para este teste
});
