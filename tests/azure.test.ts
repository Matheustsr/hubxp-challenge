import request from 'supertest';
import app from '../src/app';
import { featureFlags } from '../src/config/featureFlags';
import * as providerAzure from '../src/services/providerAzure.service';

// Mock do serviço Azure para simular falhas
jest.mock('../src/services/providerAzure.service');
const mockedProviderAzure = providerAzure as jest.Mocked<typeof providerAzure>;

describe('Azure Authentication Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAzureCredentials', () => {
    it('should validate john.doe credentials', async () => {
      // Usa o serviço real, não o mock, para testar a implementação
      jest.unmock('../src/services/providerAzure.service');
      const { validateAzureCredentials } = require('../src/services/providerAzure.service');
      
      const result = await validateAzureCredentials('john.doe', 'Test@123');
      
      expect(result).toEqual({
        id: 'azure-john',
        username: 'john.doe',
        role: 'user',
        provider: 'azure'
      });
    });

    it('should validate admin credentials', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const { validateAzureCredentials } = require('../src/services/providerAzure.service');
      
      const result = await validateAzureCredentials('admin', 'Admin@123');
      
      expect(result).toEqual({
        id: 'azure-admin',
        username: 'admin',
        role: 'admin',
        provider: 'azure'
      });
    });

    it('should throw error for invalid credentials', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const { validateAzureCredentials } = require('../src/services/providerAzure.service');
      
      await expect(validateAzureCredentials('invalid', 'wrong')).rejects.toThrow('Invalid username/password');
    });

    it('should throw error for wrong username', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const { validateAzureCredentials } = require('../src/services/providerAzure.service');
      
      await expect(validateAzureCredentials('wronguser', 'Test@123')).rejects.toThrow('Invalid username/password');
    });

    it('should throw error for wrong password', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const { validateAzureCredentials } = require('../src/services/providerAzure.service');
      
      await expect(validateAzureCredentials('john.doe', 'wrongpassword')).rejects.toThrow('Invalid username/password');
    });

    it('should handle empty credentials', async () => {
      jest.unmock('../src/services/providerAzure.service');
      const { validateAzureCredentials } = require('../src/services/providerAzure.service');
      
      await expect(validateAzureCredentials('', '')).rejects.toThrow('Invalid username/password');
    });
  });

  it('should successfully authenticate with valid Azure credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'john.doe', password: 'Test@123' }
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toEqual({
      id: 'azure-john',
      username: 'john.doe',
      role: 'user',
      provider: 'azure'
    });
  });

  it('should authenticate admin user with Azure credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'admin', password: 'Admin@123' }
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toEqual({
      id: 'azure-admin',
      username: 'admin',
      role: 'admin',
      provider: 'azure'
    });
  });

  it('should reject invalid Azure credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'invalid', password: 'wrong' }
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should validate request body structure for Azure provider', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { invalid: 'structure' }
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
  });

  it('should handle Azure provider when feature flag is disabled', async () => {
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', false);

    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'john.doe', password: 'Test@123' }
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    
    // Restaura a flag
    featureFlags.setFlag('FF_CIRCUIT_BREAKER', true);
  });

  it('should handle Azure service unavailable', async () => {
    // Simula um cenário onde o Azure retorna erro de serviço
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'service_unavailable', password: 'any' }
      });

    expect(response.status).toBe(500);
  });

  it('should handle Azure authentication timeout', async () => {
    // Simula timeout no Azure
    const response = await request(app)
      .post('/auth/login')
      .send({
        provider: 'azure',
        credentials: { username: 'timeout_user', password: 'any' }
      });

    expect(response.status).toBe(408);
  });
});
