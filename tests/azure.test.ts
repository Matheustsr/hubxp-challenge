import request from 'supertest';
import app from '../src/app';
import { featureFlags } from '../src/config/featureFlags';
import * as providerAzure from '../src/services/providerAzure.service';

// Mock do serviço Azure para simular falhas
jest.mock('../src/services/providerAzure.service');
const mockedProviderAzure = providerAzure as jest.Mocked<typeof providerAzure>;

describe('Autenticação Azure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validação de credenciais Azure', () => {
    it('deve validar credenciais do usuário john.doe', async () => {
      // Utiliza o serviço real para testar a implementação
      jest.unmock('../src/services/providerAzure.service');
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
      jest.unmock('../src/services/providerAzure.service');
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
      jest.unmock('../src/services/providerAzure.service');
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(
        validateAzureCredentials('invalid', 'wrong')
      ).rejects.toThrow('Invalid username/password');
    });

    it('deve rejeitar nome de usuário incorreto', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(
        validateAzureCredentials('wronguser', 'Test@123')
      ).rejects.toThrow('Invalid username/password');
    });

    it('deve rejeitar senha incorreta', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const {
        validateAzureCredentials,
      } = require('../src/services/providerAzure.service');

      await expect(
        validateAzureCredentials('john.doe', 'wrongpassword')
      ).rejects.toThrow('Invalid username/password');
    });

    it('deve tratar credenciais vazias adequadamente', async () => {
      jest.unmock('../src/services/providerAzure.service');
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
    expect(response.body.user).toEqual({
      id: 'azure-john',
      username: 'john.doe',
      role: 'user',
      provider: 'azure',
    });
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
    expect(response.body.user).toEqual({
      id: 'azure-admin',
      username: 'admin',
      role: 'admin',
      provider: 'azure',
    });
  });

  it('deve rejeitar credenciais Azure inválidas', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'invalid', password: 'wrong' },
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('deve validar estrutura do corpo da requisição para provedor Azure', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { invalid: 'structure' },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
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
    // Simula um cenário onde o Azure retorna erro de serviço
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'service_unavailable', password: 'any' },
      });

    expect(response.status).toBe(500);
  });

  it('deve tratar timeout de autenticação Azure', async () => {
    // Simula timeout no Azure
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'timeout_user', password: 'any' },
      });

    expect(response.status).toBe(408);
  });
});
