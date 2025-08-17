import { Router } from 'express';
import { validateBody } from '../middleware/validation';
import { LoginRequestSchema } from '../schemas/auth.schemas';
import { login, validate, logout } from '../controllers/auth.controller';

const router = Router();

/**
 * POST /auth/login
 * Autentica usuário via Google ou Azure
 */
router.post('/login', validateBody(LoginRequestSchema), login);

/**
 * GET /auth/validate
 * Valida token JWT
 */
router.get('/validate', validate);

/**
 * POST /auth/logout
 * Revoga token JWT atual
 */
router.post('/logout', logout);

export default router;
