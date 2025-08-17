import { Express } from 'express';
import authRoutes from './auth.routes';
import systemRoutes from './system.routes';

/**
 * Configura todas as rotas da aplicação
 */
export function setupRoutes(app: Express): void {
  // Rotas de autenticação
  app.use('/auth', authRoutes);

  // Rotas de sistema (health, metrics, docs) - montadas diretamente na raiz
  app.use('/', systemRoutes);
}
