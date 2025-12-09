// backend/src/utils/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

export function signAccessToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn });
}

export function signRefreshToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
