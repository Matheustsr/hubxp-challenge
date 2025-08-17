import request from 'supertest';
import app from '../src/app';
import { featureFlags } from '../src/config/featureFlags';

describe('Metrics Tests', () => {
  it('should return metrics when feature flag is enabled', async () => {
    featureFlags.setFlag('FF_METRICS', true);

    const response = await request(app).get('/metrics').expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('auth_attempts_total');
    expect(response.text).toContain('auth_success_total');
    expect(response.text).toContain('auth_fail_total');
  });

  it('should return 404 when metrics feature flag is disabled', async () => {
    featureFlags.setFlag('FF_METRICS', false);

    const response = await request(app).get('/metrics').expect(404);

    expect(response.body).toEqual({
      error: 'metrics_disabled',
    });

    // Restaurar o flag
    featureFlags.setFlag('FF_METRICS', true);
  });
});
