import path from 'path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { healthCheck, getMetrics } from '../controllers/system.controller';

const router = Router();

// Carregar OpenAPI JSON
const openapiPath = path.join(__dirname, '..', '..', 'openapi.json');
const openapi = require(openapiPath);

/**
 * GET /health
 * Health check do sistema
 */
router.get('/health', healthCheck);

/**
 * GET /metrics
 * Métricas Prometheus
 */
router.get('/metrics', getMetrics);

/**
 * /docs/*
 * Documentação Swagger
 */
router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapi, { explorer: true })
);

export default router;
