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
    disconnect: jest.fn()
  }
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
    redis.get.mockResolvedValueOnce(JSON.stringify({ success: true, result: 'cached' }));

    const payload = { operation: 'test' };
    const idempotencyKey = 'test-key-123';

    const result = await callLegacySystem(payload, idempotencyKey);
    expect(result).toEqual({ success: true, result: 'cached' });
    expect(mockedAxios.post).not.toHaveBeenCalled(); // Deve usar o cache
  });

  it('deve fazer retry com backoff exponencial quando há falhas', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValue(null); // Sem cache

    // Mock com falha inicial, depois sucesso
    mockedAxios.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { success: true, result: 'retry-success' } });

    const payload = { operation: 'test' };
    const result = await callLegacySystem(payload);

    expect(result).toEqual({ success: true, result: 'retry-success' });
    expect(mockedAxios.post).toHaveBeenCalledTimes(3); // 2 falhas + 1 sucesso
  }, 20000);

  it('deve falhar após máximo de tentativas', async () => {
    const { redis } = require('../src/infra/redisClient');
    redis.get.mockResolvedValue(null); // Sem cache

    // Mock que sempre falha
    mockedAxios.post.mockRejectedValue(new Error('Persistent error'));

    const payload = { operation: 'test' };

    await expect(callLegacySystem(payload)).rejects.toThrow('Persistent error');
    expect(mockedAxios.post).toHaveBeenCalledTimes(5); // maxRetries + 1 = 5
  }, 20000);
});
