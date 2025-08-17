import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { featureFlags } from './config/featureFlags';
import {
  apiRateLimiter,
  corsMiddleware,
  globalErrorHandler,
  notFoundHandler,
} from './middleware';
import { setupRoutes } from './routes';

const app = express();

// behind proxy/load balancer (Heroku/ELB), habilita IP correto p/ rate limit
app.set('trust proxy', 1);

// segurança básica + CORS configurado via middleware
app.use(helmet());
app.use(corsMiddleware);

// parsing e limites (evita payloads gigantes)
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: false }));

// rate limiting (feature-flag)
if (featureFlags.isEnabled('FF_RATE_LIMITING')) {
  app.use(apiRateLimiter);
}

// Configurar todas as rotas
setupRoutes(app);

// Middleware para rotas não encontradas (404)
app.use(notFoundHandler);

// Middleware global de tratamento de erros (deve ser o último)
app.use(globalErrorHandler);

export default app;
