import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../logs/logger';

export interface ValidationError {
  field: string;
  message: string;
}

export function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.') || 'body',
    message: err.message
  }));
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const validationErrors = formatZodError(result.error);
        
        logger.warn({
          event: 'validation_failed',
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          error: 'Dados inválidos',
          message: 'Os dados fornecidos não são válidos',
          details: validationErrors
        });
      }

      // Anexa os dados validados ao request para uso nos controllers
      req.body = result.data;
      next();
    } catch (error: any) {
      logger.error({
        event: 'validation_error',
        path: req.path,
        method: req.method,
        error: error.message
      });

      return res.status(500).json({
        error: 'Erro interno de validação',
        message: 'Ocorreu um erro interno durante a validação dos dados'
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const validationErrors = formatZodError(result.error);
        
        logger.warn({
          event: 'query_validation_failed',
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          error: 'Parâmetros de consulta inválidos',
          message: 'Os parâmetros de consulta fornecidos não são válidos',
          details: validationErrors
        });
      }

      req.query = result.data as any;
      next();
    } catch (error: any) {
      logger.error({
        event: 'query_validation_error',
        path: req.path,
        method: req.method,
        error: error.message
      });

      return res.status(500).json({
        error: 'Erro interno de validação',
        message: 'Ocorreu um erro interno durante a validação dos parâmetros'
      });
    }
  };
}
