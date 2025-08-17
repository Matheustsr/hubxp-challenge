import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import config from '../config';
import { cacheTokenByJti, getCachedTokenByJti, revokeTokenByJti } from '../infra/redisClient';

interface JwtPayload {
  sub: string;
  provider: string;
  role: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export function signJwt(payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'>): string {
  // Validar se o segredo JWT não é o padrão inseguro
  if (config.jwtSecret === 'alterar-isso-em-prod') {
    throw new Error('JWT_SECRET deve ser alterado em produção. Use uma chave segura de pelo menos 256 bits.');
  }

  // Gerar um JTI único para este token
  const jti = randomBytes(16).toString('hex');
  
  // Adicionar claims de segurança
  const enhancedPayload = {
    ...payload,
    jti, // JWT ID para revogação
    iss: 'hubxp-auth', // Issuer
    aud: 'hubxp-api', // Audience
  };

  const token = jwt.sign(
    enhancedPayload, 
    config.jwtSecret as string, 
    { 
      expiresIn: config.jwtExpiresIn,
      algorithm: 'HS256' // Explicitamente definir o algoritmo
    } as jwt.SignOptions
  );

  // Cache usando JTI ao invés do token completo
  cacheTokenByJti(jti, enhancedPayload, 15 * 60).catch(() => {});
  
  return token;
}

export function verifyJwt(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret as string, {
      algorithms: ['HS256'], // Permitir apenas HS256
      issuer: 'hubxp-auth',
      audience: 'hubxp-api'
    }) as JwtPayload;

    return decoded;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (err.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else if (err.name === 'NotBeforeError') {
      throw new Error('Token ainda não é válido');
    }
    throw new Error('Falha na verificação do token');
  }
}

export async function verifyJwtWithCache(token: string): Promise<JwtPayload> {
  const decoded = verifyJwt(token);
  
  if (!decoded.jti) {
    throw new Error('Token sem JTI - token inválido');
  }

  // Verificar se o token foi revogado
  const cachedPayload = await getCachedTokenByJti(decoded.jti);
  if (cachedPayload === null) {
    // Token não está no cache, pode ter sido revogado ou expirado
    // Verificar se o token ainda é válido temporalmente
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token expirado');
    }
    
    // Recriar cache se o token ainda é válido
    await cacheTokenByJti(decoded.jti, decoded, 15 * 60);
  } else if (cachedPayload === 'REVOKED') {
    throw new Error('Token foi revogado');
  }

  return decoded;
}

export async function revokeToken(token: string): Promise<void> {
  try {
    const decoded = verifyJwt(token);
    if (decoded.jti) {
      await revokeTokenByJti(decoded.jti);
    }
  } catch (err) {
    // Token já inválido, não precisa revogar
  }
}

export function generateSecureSecret(): string {
  return randomBytes(32).toString('hex');
}
