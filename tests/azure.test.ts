import request from 'supertest';
import app from '../src/app';
import { redis } from '../src/infra/redisClient';

describe('Azure Authentication', () => {
  afterAll(async () => {
    try {
      await redis.disconnect();
    } catch (error) {
      // Ignorar erros de conexão durante limpeza
    }
  }, 10000);

  it('should login with valid Azure credentials (user)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'john.doe', password: 'Test@123' } 
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should login with valid Azure credentials (admin)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'admin', password: 'Admin@123' } 
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should reject invalid Azure credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'invalid', password: 'wrong' } 
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('should reject missing username', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { password: 'Test@123' } 
      });

    expect(res.status).toBe(401);
  });

  it('should reject missing password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ 
        provider: 'azure', 
        credentials: { username: 'john.doe' } 
      });

    expect(res.status).toBe(401);
  });
});
