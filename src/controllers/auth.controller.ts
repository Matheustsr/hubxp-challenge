import { Request, Response } from 'express';
import { validateGoogleToken } from '../services/providerGoogle.service';
import { validateAzureCredentials } from '../services/providerAzure.service';
import { signJwt, verifyJwtWithCache, revokeToken } from '../services/jwt.service';
import { getCachedToken } from '../infra/redisClient';
import { createBreaker } from '../middleware/circuitBreaker';
import { logger } from '../logs/logger';

const googleBreaker = createBreaker(validateGoogleToken, 'google');
const azureBreaker = createBreaker(validateAzureCredentials, 'azure');

/**
 * POST /auth/login
 * Body: { provider: 'google' | 'azure', credentials: { token } | { username, password } }
 */
export async function login(req: Request, res: Response) {
  const { provider, credentials } = req.body;
  if (!provider || !credentials) {
    return res.status(400).json({ error: 'provider and credentials required' });
  }

  try {
    let user;
    if (provider === 'google') {
      // credentials: { token }
      user = await googleBreaker.fire(credentials.token);
    } else if (provider === 'azure') {
      // credentials: { username, password }
      user = await azureBreaker.fire(credentials.username, credentials.password);
    } else {
      return res.status(400).json({ error: 'unsupported provider' });
    }

    const payload = { 
      sub: user.id || user.username, 
      provider: user.provider || provider, 
      role: user.role || 'user' 
    };
    
    try {
      const token = signJwt(payload);
      logger.info({ event: 'login_success', provider, userId: payload.sub });
      return res.json({ token });
    } catch (jwtError: any) {
      logger.error({ event: 'jwt_generation_failed', provider, error: jwtError.message });
      return res.status(500).json({ error: 'token_generation_failed' });
    }
  } catch (err: any) {
    logger.warn({ event: 'login_failed', provider, reason: err.message });
    return res.status(401).json({ error: 'invalid_credentials' });
  }
}

/**
 * GET /auth/validate
 * Header: Authorization: Bearer <jwt>
 */
export async function validate(req: Request, res: Response) {
  const auth = req.header('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  const token = auth.slice(7);

  try {
    // Usar a nova função que verifica cache por JTI e revogação
    const payload = await verifyJwtWithCache(token);
    return res.json({ valid: true, payload });
  } catch (err: any) {
    logger.debug({ event: 'token_validation_failed', reason: err.message });
    return res.status(401).json({ valid: false, error: err.message });
  }
}

/**
 * POST /auth/logout
 * Header: Authorization: Bearer <jwt>
 * Revoga o token atual
 */
export async function logout(req: Request, res: Response) {
  const auth = req.header('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  const token = auth.slice(7);

  try {
    await revokeToken(token);
    logger.info({ event: 'logout_success', token_prefix: token.substring(0, 10) + '...' });
    return res.json({ message: 'Token revogado com sucesso' });
  } catch (err: any) {
    logger.warn({ event: 'logout_failed', reason: err.message });
    return res.status(400).json({ error: 'revocation_failed' });
  }
}
