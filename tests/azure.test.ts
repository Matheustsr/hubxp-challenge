import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';

describe('Autenticação Azure', () => {
  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  it('deve fazer login com credenciais Azure válidas (usuário)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'john.doe', password: 'Test@123' } 
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('deve fazer login com credenciais Azure válidas (admin)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'admin', password: 'Admin@123' } 
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('deve rejeitar credenciais Azure inválidas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'invalid', password: 'wrong' } 
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('deve rejeitar quando username está ausente', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { password: 'Test@123' } 
      });

    expect(res.status).toBe(401);
  });

  it('deve rejeitar quando password está ausente', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'john.doe' } 
      });

    expect(res.status).toBe(401);
  });
});
