import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import ContactQuery from '../models/Contact.js';
import { requireAdmin, requireTrustedOrigin } from '../middleware/auth.js';
import { sendContactNotifications } from '../services/contactEmail.js';

const router = Router();
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many messages. Please try again later.' }
});
const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  subject: z.string().min(2).max(120),
  message: z.string().min(10).max(3000)
}).strict();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(100).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional()
}).strict();
const queryIdSchema = z.string().uuid();
const readSchema = z.object({ isRead: z.boolean() }).strict();
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const htmlTags = /<\/?[^>]+>/g;

function sanitize(value) {
  return typeof value === 'string'
    ? value.replace(controlCharacters, '').replace(htmlTags, '').trim()
    : value;
}

function sanitizeHeader(value) {
  return typeof value === 'string' ? sanitize(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() : value;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function invalidDate(value) {
  return Number.isNaN(Date.parse(value));
}

function querySummary(query) {
  return {
    queryId: query.queryId,
    name: query.name,
    email: query.email,
    subject: query.subject,
    message: query.message,
    isRead: query.isRead,
    createdAt: query.createdAt,
    updatedAt: query.updatedAt
  };
}

router.post('/', contactLimiter, async (req, res, next) => {
  const email = sanitizeHeader(req.body?.email);
  const sanitized = {
    name: sanitizeHeader(req.body?.name),
    email: typeof email === 'string' ? email.toLowerCase() : email,
    subject: sanitizeHeader(req.body?.subject),
    message: sanitize(req.body?.message)
  };
  const parsed = contactSchema.safeParse(sanitized);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Provide a valid name, email, subject, and message.' });
  }

  try {
    const query = await ContactQuery.create(parsed.data);
    const notifications = await sendContactNotifications(query);
    return res.status(201).json({
      message: 'Your message has been saved.',
      queryId: query.queryId,
      notifications
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/', requireAdmin, async (req, res, next) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid query filters or pagination.' });
  const { page, limit, q, from, to } = parsed.data;
  if ((from && invalidDate(from)) || (to && invalidDate(to)) ||
      (from && to && Date.parse(from) > Date.parse(to))) {
    return res.status(400).json({ message: 'Provide a valid date range.' });
  }

  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const search = new RegExp(escapeRegex(q), 'i');
    filter.$or = ['name', 'email', 'subject', 'message'].map(field => ({ [field]: search }));
  }

  try {
    const [items, total] = await Promise.all([
      ContactQuery.find(filter)
        .select('queryId name email subject message isRead createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ContactQuery.countDocuments(filter)
    ]);
    return res.json({
      items: items.map(querySummary),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:queryId', requireAdmin, async (req, res, next) => {
  if (!queryIdSchema.safeParse(req.params.queryId).success) {
    return res.status(400).json({ message: 'Invalid query ID.' });
  }
  try {
    const query = await ContactQuery.findOne({ queryId: req.params.queryId }).lean();
    if (!query) return res.status(404).json({ message: 'Query not found.' });
    return res.json({ query: querySummary(query) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:queryId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!queryIdSchema.safeParse(req.params.queryId).success) {
    return res.status(400).json({ message: 'Invalid query ID.' });
  }
  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide a valid read status.' });

  try {
    const query = await ContactQuery.findOneAndUpdate(
      { queryId: req.params.queryId },
      { $set: { isRead: parsed.data.isRead } },
      { new: true, runValidators: true }
    ).lean();
    if (!query) return res.status(404).json({ message: 'Query not found.' });
    return res.json({ query: querySummary(query) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:queryId', requireAdmin, requireTrustedOrigin, async (req, res, next) => {
  if (!queryIdSchema.safeParse(req.params.queryId).success) {
    return res.status(400).json({ message: 'Invalid query ID.' });
  }
  try {
    const query = await ContactQuery.findOneAndDelete({ queryId: req.params.queryId });
    if (!query) return res.status(404).json({ message: 'Query not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
