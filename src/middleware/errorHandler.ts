import { Request, Response, NextFunction } from 'express';
import { logger } from '../logs/logger';

/**
 * Middleware global para tratamento de erros não capturados
 * Deve ser o último middleware registrado na aplicação
 */
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log do erro com contexto completo
  logger.error({ err }, 'unhandled_error');

  // Extrair código de status se disponível
  const statusCode =
    (err as Error & { statusCode?: number })?.statusCode || 500;

  // Em produção, não vazar detalhes internos
  const message =
    statusCode === 500 ? 'internal_error' : err.message || 'error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware para capturar rotas não encontradas (404)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.warn(
    {
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
    'route_not_found'
  );

  res.status(404).json({
    error: 'route_not_found',
    message: `Cannot ${req.method} ${req.url}`,
  });
};
