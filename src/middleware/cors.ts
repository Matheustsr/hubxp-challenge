import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para configuração de CORS (Cross-Origin Resource Sharing)
 * Permite requisições de diferentes origens para a API
 */
export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Permitir todas as origens (em produção, considere restringir)
  res.header('Access-Control-Allow-Origin', '*');

  // Métodos HTTP permitidos
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  // Headers permitidos nas requisições
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Responder diretamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

/**
 * Configuração mais restritiva de CORS para produção
 * Descomente e ajuste conforme necessário
 */
export const strictCorsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    // Adicione outras origens permitidas
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin as string)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};
