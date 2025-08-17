import { backoff } from '../src/utils/retryBackoff';

describe('Utilitário Retry Backoff', () => {
  it('deve retornar delays crescentes para cada tentativa', () => {
    const delay1 = backoff(1, 100);
    const delay2 = backoff(2, 100);
    const delay3 = backoff(3, 100);

    // Com jitter, os valores não são exatos, mas devem estar na faixa esperada
    expect(delay1).toBeGreaterThan(100); // > 2^1 * 100 = 200
    expect(delay1).toBeLessThan(300); // < 200 + 100 = 300
    
    expect(delay2).toBeGreaterThan(300); // > 2^2 * 100 = 400 
    expect(delay2).toBeLessThan(500); // < 400 + 100 = 500
    
    expect(delay3).toBeGreaterThan(700); // > 2^3 * 100 = 800
    expect(delay3).toBeLessThan(900); // < 800 + 100 = 900

    // Deve ser crescente
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);
  });

  it('deve limitar no delay máximo', () => {
    const delay10 = backoff(10, 100);
    const delay15 = backoff(15, 100);

    // Ambos devem estar no máximo de 10000
    expect(delay10).toBeLessThanOrEqual(10000);
    expect(delay15).toBeLessThanOrEqual(10000);
  });

  it('deve lidar com tentativa 0', () => {
    const delay0 = backoff(0, 100);
    // 2^0 * 100 + jitter = 100 + jitter (0-100)
    expect(delay0).toBeGreaterThanOrEqual(100);
    expect(delay0).toBeLessThan(200);
  });

  it('deve usar base padrão quando não fornecida', () => {
    const delay1 = backoff(1); // Base padrão = 100
    expect(delay1).toBeGreaterThan(100);
    expect(delay1).toBeLessThan(300);
  });

  it('deve lidar com diferentes valores de base', () => {
    const delay1Base200 = backoff(1, 200);
    const delay1Base50 = backoff(1, 50);

    expect(delay1Base200).toBeGreaterThan(delay1Base50);
  });
});
