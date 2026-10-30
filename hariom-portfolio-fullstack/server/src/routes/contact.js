import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import Contact from '../models/Contact.js';

const router = Router();
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many messages. Please try again later.' } });

router.post('/', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject = '', message } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 80 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120 ||
        typeof message !== 'string' || message.trim().length < 10 || message.length > 3000 ||
        typeof subject !== 'string' || subject.length > 120) {
      return res.status(400).json({ message: 'Please provide a valid name, email and message (10–3000 characters).' });
    }

    const saved = await Contact.create({
      name: name.trim(), email: email.trim().toLowerCase(),
      subject: subject.trim(), message: message.trim()
    });

    // Email is optional. The message is already saved to MongoDB if SMTP is not configured.
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.CONTACT_RECEIVER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE) === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.CONTACT_RECEIVER,
        replyTo: email,
        subject: `Portfolio contact: ${subject.trim() || 'New message'}`,
        text: `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`
      });
    }

    return res.status(201).json({ message: 'Message received successfully.', id: saved._id });
  } catch (error) {
    console.error('Contact form error:', error.message);
    return res.status(500).json({ message: 'Unable to process your message right now.' });
  }
});

export default router;