import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Admin from '../models/Admin.js';
import { authCookieName, cookieOptions, jwtSecret, requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' }
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
}).strict();

router.post('/login', requireTrustedOrigin, loginLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success || Buffer.byteLength(parsed.data?.password || '', 'utf8') > 72) {
    return res.status(400).json({ message: 'Enter a valid email and password.' });
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.verifyPassword(parsed.data.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { ver: admin.tokenVersion },
      jwtSecret(),
      { subject: admin.id, issuer: 'hariom-potofolio', algorithm: 'HS256', expiresIn: '8h' }
    );
    res.cookie(authCookieName, token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 });
    return res.status(200).json({ admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireTrustedOrigin, async (req, res, next) => {
  const token = req.cookies?.[authCookieName];
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret(), {
        algorithms: ['HS256'],
        issuer: ['hariom-potofolio', 'hariom-portfolio']
      });
      if (typeof payload === 'object' && typeof payload.sub === 'string' && Number.isInteger(payload.ver)) {
        await Admin.updateOne({ _id: payload.sub, tokenVersion: payload.ver }, { $inc: { tokenVersion: 1 } });
      }
    } catch (error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') return next(error);
    }
  }
  res.clearCookie(authCookieName, cookieOptions());
  return res.status(204).end();
});

router.get('/me', requireAdmin, (req, res) => {
  return res.json({ admin: { id: req.admin.id, email: req.admin.email } });
});

export default router;
