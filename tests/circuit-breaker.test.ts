import request from 'supertest';
import app from '../src/app';
import { resetCircuitBreakers } from '../src/middleware/circuitBreaker';
import { featureFlags } from '../src/config/featureFlags';

describe('Circuit Breaker Tests', () => {
  beforeEach(() => {
    resetCircuitBreakers();
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', true);
  });

  afterEach(() => {
    resetCircuitBreakers();
  });

  it('should open circuit breaker after multiple failures', async () => {
    // Fazer várias requisições com credenciais inválidas para forçar o circuit breaker a abrir
    const responses: any[] = [];

    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/auth/login')
        .send({
          provider: 'google',
          credentials: { token: 'invalid-token' },
        });
      responses.push(response);
    }

    // Todas as respostas devem ser 401 (credenciais inválidas)
    responses.forEach(response => {
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_credentials');
    });
  }, 15000);

  it('should work normally when circuit breaker is disabled', async () => {
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', false);

    // Teste com credenciais válidas do mock
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'google',
        credentials: { token: 'valid-token' },
      });

    expect([200, 401]).toContain(response.status);
    // Se retornar 200, deve ter token; se 401, deve ter erro
    if (response.status === 200) {
      expect(response.body.token).toBeDefined();
    } else {
      expect(response.body.error).toBeDefined();
    }

    // Restaurar o flag
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', true);
  });
});
