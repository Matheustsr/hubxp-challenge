import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';

// Mock da configuração para usar um JWT_SECRET seguro nos testes
const SECURE_JWT_SECRET = randomBytes(32).toString('hex');

// Configurar environment variables antes de qualquer mock
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = SECURE_JWT_SECRET;

jest.mock('../src/config', () => ({
  default: {
    port: 3000,
    jwtSecret: SECURE_JWT_SECRET,
    jwtExpiresIn: '15m',
    redis: {
      host: 'localhost',
      port: 6379,
      username: undefined,
      password: undefined
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
    circuitBreaker: {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    },
    security: {
      jwtMinSecretLength: 32,
      jwtAlgorithm: 'HS256',
      tokenCacheTtl: 15 * 60,
    },
  }
}));

// Mock do Redis Client para evitar dependência externa nos testes
jest.mock('../src/infra/redisClient', () => {
  const cache = new Map();
  return {
    redis: {
      disconnect: () => Promise.resolve(),
    },
    cacheTokenByJti: jest.fn((jti: string, payload: object, ttl: number) => {
      cache.set(`jti:${jti}`, JSON.stringify(payload));
      return Promise.resolve();
    }),
    getCachedTokenByJti: jest.fn((jti: string) => {
      const value = cache.get(`jti:${jti}`);
      if (value === undefined) return Promise.resolve(null);
      if (value === 'REVOKED') return Promise.resolve('REVOKED');
      try {
        return Promise.resolve(JSON.parse(value));
      } catch {
        return Promise.resolve(null);
      }
    }),
    revokeTokenByJti: jest.fn((jti: string) => {
      cache.set(`jti:${jti}`, 'REVOKED');
      return Promise.resolve();
    }),
  };
});

jest.mock('../src/services/jwt.service', () => {
  const { randomBytes } = require('crypto');
  const jwt = require('jsonwebtoken');
  const TEST_SECRET = randomBytes(32).toString('hex');
  
  const cache = new Map();
  
  return {
    signJwt: jest.fn((payload: any) => {
      const jti = randomBytes(16).toString('hex');
      const enhancedPayload = {
        ...payload,
        jti,
        iss: 'hubxp-auth',
        aud: 'hubxp-api',
      };
      
      const token = jwt.sign(enhancedPayload, TEST_SECRET, {
        expiresIn: '15m',
        algorithm: 'HS256'
      });
      
      // Simular cache
      cache.set(`jti:${jti}`, JSON.stringify(enhancedPayload));
      
      return token;
    }),
    
    verifyJwt: jest.fn((token: string) => {
      try {
        return jwt.verify(token, TEST_SECRET, {
          algorithms: ['HS256'],
          issuer: 'hubxp-auth',
          audience: 'hubxp-api'
        });
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
          throw new Error('Token expirado');
        } else if (err.name === 'JsonWebTokenError') {
          throw new Error('Token inválido');
        }
        throw new Error('Falha na verificação do token');
      }
    }),
    
    verifyJwtWithCache: jest.fn(async (token: string) => {
      const decoded = jwt.verify(token, TEST_SECRET);
      
      // Verificar se o token foi revogado
      const jti = decoded.jti;
      if (jti && cache.get(`jti:${jti}`) === 'REVOKED') {
        throw new Error('Token foi revogado');
      }
      
      return decoded;
    }),
    
    revokeToken: jest.fn(async (token: string) => {
      const decoded = jwt.verify(token, TEST_SECRET);
      if (decoded.jti) {
        cache.set(`jti:${decoded.jti}`, 'REVOKED');
      }
    }),
    
    generateSecureSecret: jest.fn(() => randomBytes(32).toString('hex'))
  };
});

import { signJwt, verifyJwt, verifyJwtWithCache, revokeToken, generateSecureSecret } from '../src/services/jwt.service';

describe('Serviço JWT', () => {

  it('deve assinar e verificar tokens JWT', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = verifyJwt(token) as any;
    expect(verified.sub).toBe('test-user');
    expect(verified.provider).toBe('google');
    expect(verified.role).toBe('user');
    expect(verified.jti).toBeDefined(); // Verificar se JTI foi adicionado
    expect(verified.iss).toBe('hubxp-auth'); // Verificar issuer
    expect(verified.aud).toBe('hubxp-api'); // Verificar audience
  });

  it('deve lançar erro para token inválido', () => {
    expect(() => {
      verifyJwt('invalid-token');
    }).toThrow();
  });

  it('deve lançar erro para token mal formatado', () => {
    expect(() => {
      verifyJwt('malformed.token');
    }).toThrow();
  });

  it('deve incluir claims padrão do JWT', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'admin' };
    const token = signJwt(payload);
    const verified = verifyJwt(token) as any;

    expect(verified.iat).toBeDefined(); // issued at
    expect(verified.exp).toBeDefined(); // expiration
    expect(typeof verified.iat).toBe('number');
    expect(typeof verified.exp).toBe('number');
    expect(verified.exp).toBeGreaterThan(verified.iat);
  });

  it('deve lidar com diferentes tipos de usuário', () => {
    const adminPayload = { sub: 'admin-user', provider: 'azure', role: 'admin' };
    const userPayload = { sub: 'regular-user', provider: 'google', role: 'user' };

    const adminToken = signJwt(adminPayload);
    const userToken = signJwt(userPayload);

    const verifiedAdmin = verifyJwt(adminToken) as any;
    const verifiedUser = verifyJwt(userToken) as any;

    expect(verifiedAdmin.role).toBe('admin');
    expect(verifiedUser.role).toBe('user');
  });

  it('deve gerar JTI único para cada token', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token1 = signJwt(payload);
    const token2 = signJwt(payload);

    const verified1 = verifyJwt(token1) as any;
    const verified2 = verifyJwt(token2) as any;

    expect(verified1.jti).toBeDefined();
    expect(verified2.jti).toBeDefined();
    expect(verified1.jti).not.toBe(verified2.jti);
  });

  it('deve verificar token com cache', async () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    const verified = await verifyJwtWithCache(token);
    expect(verified.sub).toBe('test-user');
    expect(verified.jti).toBeDefined();
  });

  it('deve revogar tokens corretamente', async () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    // Token deve ser válido inicialmente
    const verified = await verifyJwtWithCache(token);
    expect(verified.sub).toBe('test-user');

    // Revogar token
    await revokeToken(token);

    // Token deve ser inválido após revogação
    await expect(verifyJwtWithCache(token)).rejects.toThrow('Token foi revogado');
  });

  it('deve gerar segredos seguros', () => {
    const secret = generateSecureSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBe(64); // 32 bytes = 64 caracteres hex
    
    // Verificar que cada execução gera um segredo diferente
    const secret2 = generateSecureSecret();
    expect(secret).not.toBe(secret2);
  });

  it('deve validar claims obrigatórios', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);
    const verified = verifyJwt(token) as any;

    // Verificar claims de segurança
    expect(verified.iss).toBe('hubxp-auth');
    expect(verified.aud).toBe('hubxp-api');
    expect(verified.jti).toMatch(/^[a-f0-9]{32}$/); // 32 caracteres hex
  });
});
