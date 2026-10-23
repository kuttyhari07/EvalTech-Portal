import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config/env';
import { UserRole } from '../constants';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = config.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: config.COOKIE_DOMAIN || undefined,
  });
}

export function clearAuthCookie(res: Response): void {
  const isProduction = config.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    domain: config.COOKIE_DOMAIN || undefined,
  });
}
