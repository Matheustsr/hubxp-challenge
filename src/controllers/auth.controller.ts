import { Request, Response } from 'express';
import { validateGoogleToken } from '../services/providerGoogle.service';
import { validateAzureCredentials } from '../services/providerAzure.service';
import {
  signJwt,
  verifyJwtWithCache,
  revokeToken,
} from '../services/jwt.service';
import { createBreaker } from '../middleware/circuitBreaker';
import { logger } from '../logs/logger';
import { featureFlags } from '../config/featureFlags';
import {
  authAttemptsTotal,
  authSuccessTotal,
  authFailTotal,
  tokenValidationTotal,
} from '../metrics/businessMetrics';
import {
  LoginRequest,
  GoogleLoginSchema,
  AzureLoginSchema,
} from '../schemas/auth.schemas';

// Tipos para os usuários autenticados
interface AuthenticatedUser {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  role?: string;
  provider: string;
}

const googleBreaker = createBreaker(validateGoogleToken, 'google');
const azureBreaker = createBreaker(validateAzureCredentials, 'azure');

/**
 * POST /auth/login
 * Body: { provider: 'google' | 'azure', credentials: { token } | { username, password } }
 */
export async function login(req: Request, res: Response) {
  // A validação já foi feita pelo middleware de validação
  const { provider, credentials } = req.body as LoginRequest;

  // Incrementar métrica de tentativas de autenticação
  if (featureFlags.isEnabled('FF_METRICS')) {
    authAttemptsTotal.inc({ provider, status: 'attempted' });
  }

  try {
    let user: AuthenticatedUser;
    if (provider === 'google') {
      // Validação específica para Google
      const googleData = GoogleLoginSchema.parse({ provider, credentials });
      user = await googleBreaker.fire(googleData.credentials.token) as AuthenticatedUser;
    } else if (provider === 'azure') {
      // Validação específica para Azure
      const azureData = AzureLoginSchema.parse({ provider, credentials });
      user = await azureBreaker.fire(
        azureData.credentials.username,
        azureData.credentials.password
      ) as AuthenticatedUser;
    } else {
      // Este caso não deveria acontecer devido à validação do middleware
      if (featureFlags.isEnabled('FF_METRICS')) {
        authFailTotal.inc({ provider, reason: 'unsupported_provider' });
      }
      return res.status(400).json({
        error: 'provider_not_supported',
        message: 'Provider não suportado',
        details: [
          {
            field: 'provider',
            message: 'Provider deve ser "google" ou "azure"',
          },
        ],
      });
    }

    const payload = {
      sub: user.id || user.username || user.email || 'unknown',
      provider: user.provider || provider,
      role: user.role || 'user',
    };

    try {
      const token = signJwt(payload);

      // Incrementar métricas de sucesso
      if (featureFlags.isEnabled('FF_METRICS')) {
        authSuccessTotal.inc({ provider });
        authAttemptsTotal.inc({ provider, status: 'success' });
      }

      logger.info({ event: 'login_success', provider, userId: payload.sub });
      return res.json({ token });
    } catch (jwtError: unknown) {
      if (featureFlags.isEnabled('FF_METRICS')) {
        authFailTotal.inc({ provider, reason: 'jwt_generation_failed' });
      }

      logger.error({
        event: 'jwt_generation_failed',
        provider,
        error: (jwtError as Error).message,
      });
      return res.status(500).json({
        error: 'token_generation_failed',
        message: 'Falha na geração do token de acesso',
      });
    }
  } catch (err: unknown) {
    // Incrementar métricas de falha
    if (featureFlags.isEnabled('FF_METRICS')) {
      authFailTotal.inc({ provider, reason: 'invalid_credentials' });
      authAttemptsTotal.inc({ provider, status: 'failed' });
    }

    logger.warn({ event: 'login_failed', provider, reason: (err as Error).message });
    return res.status(401).json({
      error: 'invalid_credentials',
      message: 'Credenciais inválidas',
    });
  }
}

/**
 * GET /auth/validate
 * Header: Authorization: Bearer <jwt>
 */
export async function validate(req: Request, res: Response) {
  const auth = req.header('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    if (featureFlags.isEnabled('FF_METRICS')) {
      tokenValidationTotal.inc({ status: 'missing_token' });
    }

    return res.status(401).json({
      error: 'missing_token',
      message: 'Token de autorização ausente ou inválido',
      details: [
        {
          field: 'authorization',
          message: 'Header Authorization com Bearer token é obrigatório',
        },
      ],
    });
  }
  const token = auth.slice(7);

  try {
    // Usar a nova função que verifica cache por JTI e revogação
    const payload = await verifyJwtWithCache(token);

    if (featureFlags.isEnabled('FF_METRICS')) {
      tokenValidationTotal.inc({ status: 'valid' });
    }

    return res.json({ valid: true, payload });
  } catch (err: unknown) {
    const errMessage = (err as Error).message;
    const isExpired =
      errMessage.includes('expired') || errMessage.includes('jwt expired');
    const status = isExpired ? 'expired' : 'invalid';

    if (featureFlags.isEnabled('FF_METRICS')) {
      tokenValidationTotal.inc({ status });
    }

    logger.debug({ event: 'token_validation_failed', reason: errMessage });
    return res.status(401).json({
      valid: false,
      error: 'invalid_token',
      message: 'Token inválido ou expirado',
    });
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
    return res.status(401).json({
      error: 'missing_token',
      message: 'Token de autorização ausente ou inválido',
      details: [
        {
          field: 'authorization',
          message: 'Header Authorization com Bearer token é obrigatório',
        },
      ],
    });
  }
  const token = auth.slice(7);

  try {
    await revokeToken(token);
    logger.info({
      event: 'logout_success',
      token_prefix: token.substring(0, 10) + '...',
    });
    return res.json({ message: 'Token revogado com sucesso' });
  } catch (err: unknown) {
    logger.warn({ event: 'logout_failed', reason: (err as Error).message });
    return res.status(400).json({
      error: 'revocation_failed',
      message: 'Falha ao revogar o token',
    });
  }
}
