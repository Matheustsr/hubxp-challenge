import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';
import { featureFlags } from '../src/config/featureFlags';
import * as providerAzure from '../src/services/providerAzure.service';

// Mock do serviço Azure para simular falhas
jest.mock('../src/services/providerAzure.service');
const mockedProviderAzure = providerAzure as jest.Mocked<typeof providerAzure>;

describe('Autenticação Azure', () => {
  beforeEach(() => {
    // Reset feature flags
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', true);
    featureFlags.setFlag('FF_CACHE_TOKEN', true);
    featureFlags.setFlag('FF_METRICS', true);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  describe('Successful Authentication', () => {
    it('deve fazer login com credenciais Azure válidas (usuário)', async () => {
      mockedProviderAzure.validateAzureCredentials.mockResolvedValue({
        id: 'user123',
        username: 'john.doe',
        role: 'user',
        provider: 'azure'
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ 
          provider: 'azure', 
          credentials: { username: 'john.doe', password: 'Test@123' } 
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(mockedProviderAzure.validateAzureCredentials).toHaveBeenCalledWith('john.doe', 'Test@123');
    });

    it('deve fazer login com credenciais Azure válidas (admin)', async () => {
      mockedProviderAzure.validateAzureCredentials.mockResolvedValue({
        id: 'admin123',
        username: 'admin',
        role: 'admin',
        provider: 'azure'
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ 
          provider: 'azure', 
          credentials: { username: 'admin', password: 'Admin@123' } 
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(mockedProviderAzure.validateAzureCredentials).toHaveBeenCalledWith('admin', 'Admin@123');
    });
  });

  describe('Failed Authentication', () => {
    it('deve rejeitar credenciais Azure inválidas', async () => {
      mockedProviderAzure.validateAzureCredentials.mockRejectedValue(new Error('Invalid credentials'));

      const res = await request(app)
        .post('/auth/login')
        .send({ 
          provider: 'azure', 
          credentials: { username: 'invalid', password: 'wrong' } 
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_credentials');
    });

    it('deve rejeitar quando username está ausente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ provider: 'azure', credentials: { password: 'password' } });

      expect(res.status).toBe(400); // Validation error
      expect(res.body.error).toBe('Dados inválidos');
    });

    it('deve rejeitar quando password está ausente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ provider: 'azure', credentials: { username: 'user' } });

      expect(res.status).toBe(400); // Validation error
      expect(res.body.error).toBe('Dados inválidos');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should handle Azure service failures with circuit breaker', async () => {
      // Simular falhas consecutivas para abrir o circuit breaker
      mockedProviderAzure.validateAzureCredentials.mockRejectedValue(new Error('Service unavailable'));

      const res = await request(app)
        .post('/auth/login')
        .send({ 
          provider: 'azure', 
          credentials: { username: 'test', password: 'test' } 
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_credentials');
    });

    it('should work when circuit breaker is disabled', async () => {
      featureFlags.setFlag('FF_CIRCUIT_BREAKER', false);
      
      mockedProviderAzure.validateAzureCredentials.mockResolvedValue({
        id: 'user123',
        username: 'john.doe',
        role: 'user',
        provider: 'azure'
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ 
          provider: 'azure', 
          credentials: { username: 'john.doe', password: 'Test@123' } 
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('Service Timeout', () => {
    it('should handle Azure service timeout', async () => {
      // Simular timeout
      mockedProviderAzure.validateAzureCredentials.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const res = await request(app)
        .post('/auth/login')
        .send({ 
          provider: 'azure', 
          credentials: { username: 'test', password: 'test' } 
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_credentials');
    });
  });
});
