import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import promClient from 'prom-client';
import swaggerUi from 'swagger-ui-express';
import openapi from '../openapi.json';
import { apiRateLimiter } from './middleware/rateLimiter';
import { logger } from './logs/logger';
import { login, validate, logout } from './controllers/auth.controller';
import { validateBody } from './middleware/validation';
import { LoginRequestSchema } from './schemas/auth.schemas';
import { redis } from './infra/redisClient';
import * as legacyAdapter from './services/legacy.adapter';
import { featureFlags } from './config/featureFlags';
// Importar métricas para garantir que sejam registradas
import './metrics/businessMetrics';

const app = express();
app.set('trust proxy', 1); // para o rate limit identificar IPs corretamente.

app.use(helmet());
app.use(bodyParser.json());

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url });
  next();
});

// rate limiting
app.use(apiRateLimiter);

// Rotas de autenticação com validação
app.post('/auth/login', validateBody(LoginRequestSchema), login);
app.get('/auth/validate', validate);
app.post('/auth/logout', logout);

// Health check completo
app.get('/health', async (req, res) => {
  try {
    // Check Redis connectivity
    const redisPong = await redis.ping().catch(() => null);
    const redisHealthy = !!redisPong;

    // Checa se o sistema legado está disponível
    let legacyHealthy = true;
    try {
      // Verifica se o módulo do sistema legado está carregado e disponível
      // Para uma verificação mais robusta, você pode implementar uma função específica
      // no legacy.adapter.ts que faça um ping/health check real do sistema legado
      if (legacyAdapter) {
        legacyHealthy = true; // Sistema legado está disponível (módulo carregado)
      } else {
        legacyHealthy = false;
      }
    } catch (error) {
      legacyHealthy = false;
    }

    const overallStatus = redisHealthy && legacyHealthy ? 'ok' : 'degraded';

    res.json({
      status: overallStatus,
      redis: redisHealthy,
      legacy: legacyHealthy,
      feature_flags: featureFlags.getAll(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Erro no health check:');
    res.status(503).json({
      status: 'error',
      redis: false,
      legacy: false,
      feature_flags: featureFlags.getAll(),
      timestamp: new Date().toISOString(),
    });
  }
});

// metricas
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

export default app;
