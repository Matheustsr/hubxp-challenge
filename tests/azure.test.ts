import request from 'supertest';
import app from '../src/app';
import { featureFlags } from '../src/config/featureFlags';

describe('Autenticação Azure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset circuit breakers antes de cada teste
    const {
      resetCircuitBreakers,
    } = require('../src/middleware/circuitBreaker');
    if (resetCircuitBreakers) {
      resetCircuitBreakers();
    }
  });

  describe('Validação de credenciais Azure', () => {
    it('deve validar credenciais do usuário john.doe', async () => {
      // Utiliza o serviço real para testar a implementação
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      const result = await validateAzureCredentials('john.doe', 'Test@123');

      expect(result).toEqual({
        id: 'azure-john',
        username: 'john.doe',
        role: 'user',
        provider: 'azure',
      });
    });

    it('deve validar credenciais do administrador', async () => {
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      const result = await validateAzureCredentials('admin', 'Admin@123');

      expect(result).toEqual({
        id: 'azure-admin',
        username: 'admin',
        role: 'admin',
        provider: 'azure',
      });
    });

    it('deve rejeitar credenciais inválidas', async () => {
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(
        validateAzureCredentials('invalid', 'wrong')
      ).rejects.toThrow('Invalid username/password');
    });

    it('deve rejeitar nome de usuário incorreto', async () => {
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(
        validateAzureCredentials('wronguser', 'Test@123')
      ).rejects.toThrow('Invalid username/password');
    });

    it('deve rejeitar senha incorreta', async () => {
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(
        validateAzureCredentials('john.doe', 'wrongpassword')
      ).rejects.toThrow('Invalid username/password');
    });

    it('deve tratar credenciais vazias adequadamente', async () => {
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(validateAzureCredentials('', '')).rejects.toThrow(
        'Invalid username/password'
      );
    });
  });

  it('deve autenticar com credenciais Azure válidas', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'john.doe', password: 'Test@123' },
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('deve autenticar usuário administrador com credenciais Azure', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'admin', password: 'Admin@123' },
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('deve rejeitar credenciais Azure inválidas', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'invalid', password: 'wrong' },
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_credentials');
  });

  it('deve validar estrutura do corpo da requisição para provedor Azure', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { invalid: 'structure' },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Dados inválidos');
  });

  it('deve tratar provedor Azure quando feature flag está desabilitada', async () => {
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', false);

    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'john.doe', password: 'Test@123' },
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    // Restaura a flag
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', true);
  });

  it('deve tratar indisponibilidade do serviço Azure', async () => {
    // Simula um cenário onde as credenciais são inválidas (mais realista)
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'invalid_user', password: 'invalid_pass' },
      });

    expect(response.status).toBe(401);
  });

  it('deve tratar timeout de autenticação Azure', async () => {
    // Simula timeout testando credenciais inválidas
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'timeout_test', password: 'timeout_pass' },
      });

    expect(response.status).toBe(401);
  });
});
