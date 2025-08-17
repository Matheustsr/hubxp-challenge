import { signJwt, verifyJwt } from '../src/services/jwt.service';

describe('JWT Service', () => {
  it('should sign and verify JWT tokens', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'user' };
    const token = signJwt(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = verifyJwt(token) as any;
    expect(verified.sub).toBe('test-user');
    expect(verified.provider).toBe('google');
    expect(verified.role).toBe('user');
  });

  it('should throw error for invalid token', () => {
    expect(() => {
      verifyJwt('invalid-token');
    }).toThrow();
  });

  it('should throw error for malformed token', () => {
    expect(() => {
      verifyJwt('malformed.token');
    }).toThrow();
  });

  it('should include standard JWT claims', () => {
    const payload = { sub: 'test-user', provider: 'google', role: 'admin' };
    const token = signJwt(payload);
    const verified = verifyJwt(token) as any;

    expect(verified.iat).toBeDefined(); // issued at
    expect(verified.exp).toBeDefined(); // expiration
    expect(typeof verified.iat).toBe('number');
    expect(typeof verified.exp).toBe('number');
    expect(verified.exp).toBeGreaterThan(verified.iat);
  });

  it('should handle different user roles', () => {
    const adminPayload = { sub: 'admin-user', provider: 'azure', role: 'admin' };
    const userPayload = { sub: 'regular-user', provider: 'google', role: 'user' };

    const adminToken = signJwt(adminPayload);
    const userToken = signJwt(userPayload);

    const verifiedAdmin = verifyJwt(adminToken) as any;
    const verifiedUser = verifyJwt(userToken) as any;

    expect(verifiedAdmin.role).toBe('admin');
    expect(verifiedUser.role).toBe('user');
  });
});
