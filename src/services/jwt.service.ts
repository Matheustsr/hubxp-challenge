import jwt from 'jsonwebtoken';
import config from '../config';
import { cacheToken } from '../infra/redisClient';


export function signJwt(payload: object) {
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  cacheToken(token, payload, 15 * 60).catch(() => {});
  return token;
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new Error('Invalid token');
  }
}
