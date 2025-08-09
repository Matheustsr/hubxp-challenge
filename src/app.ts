// app.ts
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

// Basic security headers
app.use(helmet());
app.use(bodyParser.json());

// logging middleware (simple)
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url });
  next();
});

// rate limiting
app.use(apiRateLimiter);

// routes
app.post('/auth/login', login);
app.get('/auth/validate', validate);

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// metrics (prom-client)
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

export default app;
