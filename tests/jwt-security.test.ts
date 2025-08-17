import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Simulação das funções JWT com segredo seguro para testes
const TEST_JWT_SECRET = randomBytes(32).toString('hex');

function signJwtTest(payload: any) {
  const jti = randomBytes(16).toString('hex');
  const enhancedPayload = {
    ...payload,
    jti,
    iss: 'hubxp-auth',
    aud: 'hubxp-api',
  };

  return jwt.sign(enhancedPayload, TEST_JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256'
  });
}

function verifyJwtTest(token: string) {
  return jwt.verify(token, TEST_JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'hubxp-auth',
    audience: 'hubxp-api'
  });
}

function generateSecureSecretTest(): string {
  return randomBytes(32).toString('hex');
}

describe('Serviço JWT - Melhorias de Segurança', () => {
  it('deve assinar e verificar tokens JWT com claims de segurança', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwtTest(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = verifyJwtTest(token) as any;
    expect(verified.sub).toBe('test-user');
    expect(verified.provider).toBe('google');
    expect(verified.role).toBe('user');
    expect(verified.jti).toBeDefined(); // Verificar se JTI foi adicionado
    expect(verified.iss).toBe('hubxp-auth'); // Verificar issuer
    expect(verified.aud).toBe('hubxp-api'); // Verificar audience
  });

  it('deve gerar JTI único para cada token', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token1 = signJwtTest(payload);
    const token2 = signJwtTest(payload);

    const verified1 = verifyJwtTest(token1) as any;
    const verified2 = verifyJwtTest(token2) as any;

    expect(verified1.jti).toBeDefined();
    expect(verified2.jti).toBeDefined();
    expect(verified1.jti).not.toBe(verified2.jti);
  });

  it('deve gerar segredos seguros', () => {
    const secret = generateSecureSecretTest();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBe(64); // 32 bytes = 64 caracteres hex
    
    // Verificar que cada execução gera um segredo diferente
    const secret2 = generateSecureSecretTest();
    expect(secret).not.toBe(secret2);
  });

  it('deve validar claims obrigatórios', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwtTest(payload);
    const verified = verifyJwtTest(token) as any;

    // Verificar claims de segurança
    expect(verified.iss).toBe('hubxp-auth');
    expect(verified.aud).toBe('hubxp-api');
    expect(verified.jti).toMatch(/^[a-f0-9]{32}$/); // 32 caracteres hex
  });

  it('deve falhar com token sem secret adequado', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    
    // Criar token com secret muito fraco
    const weakToken = jwt.sign(payload, 'weak', { algorithm: 'HS256' });
    
    // Verificação com secret correto deve falhar
    expect(() => {
      verifyJwtTest(weakToken);
    }).toThrow();
  });

  it('deve incluir claims padrão do JWT', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'admin' };
    const token = signJwtTest(payload);
    const verified = verifyJwtTest(token) as any;

    expect(verified.iat).toBeDefined(); // issued at
    expect(verified.exp).toBeDefined(); // expiration
    expect(typeof verified.iat).toBe('number');
    expect(typeof verified.exp).toBe('number');
    expect(verified.exp).toBeGreaterThan(verified.iat);
  });

  it('deve validar issuer e audience', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwtTest(payload);

    // Token com issuer/audience corretos deve funcionar
    const verified = verifyJwtTest(token);
    expect(verified).toBeDefined();

    // Token com issuer/audience incorretos deve falhar
    const tokenWrongClaims = jwt.sign(
      { ...payload, iss: 'wrong-issuer', aud: 'wrong-audience' },
      TEST_JWT_SECRET
    );

    expect(() => {
      verifyJwtTest(tokenWrongClaims);
    }).toThrow();
  });
});
