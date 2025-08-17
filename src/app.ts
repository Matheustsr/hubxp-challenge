import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import config from './config';
import { apiRateLimiter } from './middleware/rateLimiter';
import { logger } from './logs/logger';
import { login, validate, logout } from './controllers/auth.controller';
import { validateBody } from './middleware/validation';
import { LoginRequestSchema } from './schemas/auth.schemas';
import promClient from 'prom-client';
import swaggerUi from 'swagger-ui-express';
import openapi from '../openapi.json';

const app = express();
app.set('trust proxy', 1);  // para o rate limit identificar IPs corretamente.

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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// metricas
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

export default app;
