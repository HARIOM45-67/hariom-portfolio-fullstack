import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const authCookieName = 'portfolio_admin_session';

export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  }
  return secret;
}

export function cookieOptions() {
  const sameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/api',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  };
}

export async function requireAdmin(req, res, next) {
  const token = req.cookies?.[authCookieName];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'],
      issuer: ['hariom-potofolio', 'hariom-portfolio']
    });
    if (typeof payload !== 'object' || typeof payload.sub !== 'string' || !Number.isInteger(payload.ver)) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin || admin.tokenVersion !== payload.ver) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    req.admin = admin;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    return next(error);
  }
}

export function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin');
  const defaultClientOrigin = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173';
  const allowedOrigins = (process.env.CLIENT_ORIGIN || defaultClientOrigin)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  return next();
}
