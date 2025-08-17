import { Request, Response } from 'express';
import { validateGoogleToken } from '../services/providerGoogle.service';
import { validateAzureCredentials } from '../services/providerAzure.service';
import { signJwt } from '../services/jwt.service';
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

    const payload = { sub: user.id || user.username, provider: user.provider, role: user.role || 'user' };
    const token = signJwt(payload);

    logger.info({ event: 'login_success', provider, userId: payload.sub });

    return res.json({ token });
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

  const cached = await getCachedToken(token);
  if (cached) {
    return res.json({ valid: true, payload: cached });
  }

  try {
    const payload = require('../services/jwt.service').verifyJwt(token);
    await require('../infra/redisClient').cacheToken(token, payload, 15 * 60);
    return res.json({ valid: true, payload });
  } catch (err) {
    return res.status(401).json({ valid: false });
  }
}
