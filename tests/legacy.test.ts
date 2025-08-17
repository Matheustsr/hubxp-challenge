import { callLegacySystem } from '../src/services/legacy.adapter';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Redis para evitar problemas de conexão
jest.mock('../src/infra/redisClient', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    disconnect: jest.fn(),
  },
}));

describe('Adaptador Sistema Legado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve chamar sistema legado com sucesso', async () => {
    const mockResponse = { data: { success: true, result: 'data' } };
    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const payload = { operation: 'test' };
    const result = await callLegacySystem(payload);

    expect(result).toEqual({ success: true, result: 'data' });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://legacy:4000/op',
      payload,
      { timeout: 5000 }
    );
  });

  it('deve implementar idempotência com cache', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValueOnce(
      JSON.stringify({ success: true, result: 'cached' })
    );

    const payload = { operation: 'test' };
    const idempotencyKey = 'test-key-123';

    const result = await callLegacySystem(payload, idempotencyKey);
    expect(result).toEqual({ success: true, result: 'cached' });
    expect(mockedAxios.post).not.toHaveBeenCalled(); // Deve usar o cache
  });

  it('deve fazer retry com backoff exponencial quando há falhas de servidor (5xx)', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValue(null); // Sem cache

    // Mock com falha inicial 500, depois sucesso
    const error500 = new Error('Server Error');
    (error500 as any).response = { status: 500 };

    mockedAxios.post
      .mockRejectedValueOnce(error500)
      .mockRejectedValueOnce(error500)
      .mockResolvedValueOnce({
        data: { success: true, result: 'retry-success' },
      });

    const payload = { operation: 'test' };
    const result = await callLegacySystem(payload);

    expect(result).toEqual({ success: true, result: 'retry-success' });
    expect(mockedAxios.post).toHaveBeenCalledTimes(3); // 2 falhas + 1 sucesso
  }, 20000);

  it('NÃO deve fazer retry para erros 4xx (erros do cliente)', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValue(null); // Sem cache

    // Mock com erro 400 (Bad Request)
    const error400 = new Error('Bad Request');
    (error400 as any).response = { status: 400 };

    mockedAxios.post.mockRejectedValue(error400);

    const payload = { operation: 'test' };

    await expect(callLegacySystem(payload)).rejects.toThrow('Bad Request');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Apenas 1 tentativa, sem retry
  });

  it('deve fazer retry para erros de rede (sem response)', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValue(null); // Sem cache

    // Mock com erro de rede (sem response)
    const networkError = new Error('Network error');
    // Sem response property = erro de rede

    mockedAxios.post.mockRejectedValueOnce(networkError).mockResolvedValueOnce({
      data: { success: true, result: 'network-retry-success' },
    });

    const payload = { operation: 'test' };
    const result = await callLegacySystem(payload);

    expect(result).toEqual({ success: true, result: 'network-retry-success' });
    expect(mockedAxios.post).toHaveBeenCalledTimes(2); // 1 falha + 1 sucesso
  }, 20000);

  it('deve falhar após máximo de tentativas', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValue(null); // Sem cache

    // Mock que sempre falha
    mockedAxios.post.mockRejectedValue(new Error('Persistent error'));

    const payload = { operation: 'test' };

    await expect(callLegacySystem(payload)).rejects.toThrow('Persistent error');
    expect(mockedAxios.post).toHaveBeenCalledTimes(4); // maxRetries = 4
  }, 20000);
});
