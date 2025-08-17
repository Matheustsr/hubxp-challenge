import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import config from './config';
import { apiRateLimiter } from './middleware/rateLimiter';
import { logger } from './logs/logger';
import { login, validate } from './controllers/auth.controller';
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

app.post('/auth/login', login);
app.get('/auth/validate', validate);

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
