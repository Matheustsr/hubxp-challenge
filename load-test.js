import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 usuários virtuais simultâneos
  duration: '30s', // duração total do teste
};

export default function () {
  const url = 'http://localhost:3000/auth/login';
  const payload = JSON.stringify({
    provider: 'google',
    credentials: { token: 'google_valid_token_123' },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });

  sleep(1);
}
