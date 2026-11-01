import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import queryRoutes from './routes/queries.js';
import resumeRoutes from './routes/resume.js';
import projectRoutes from './routes/projects.js';
import githubRoutes from './routes/github.js';
import analyticsRoutes from './routes/analytics.js';
import HttpError from './utils/HttpError.js';
import { connectDatabase } from './config/database.js';

const app = express();
const defaultClientOrigin = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173';
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || defaultClientOrigin)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '20kb', strict: true }));
app.use(cookieParser());
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/api/health', async (_req, res) => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('MongoDB connection failed for health check:', { name: error.name });
    return res.status(503).json({
      status: 'unavailable',
      service: 'hariom-potofolio API',
      database: 'disconnected'
    });
  }

  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    service: 'hariom-potofolio API',
    database: connected ? 'connected' : 'disconnected'
  });
});

async function requireDatabase(_req, res, next) {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    console.error('MongoDB connection failed for API request:', { name: error.name });
    return res.status(503).json({
      message: error.message === 'MONGODB_URI must be configured before connecting to MongoDB.'
        ? 'MONGODB_URI must be configured.'
        : 'Database is temporarily unavailable.',
      database: 'disconnected'
    });
  }
}

app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/queries', requireDatabase, queryRoutes);
app.use('/api/contact', requireDatabase, queryRoutes);
app.use('/api/resume', requireDatabase, resumeRoutes);
app.use('/api/projects', requireDatabase, projectRoutes);
app.use('/api/github', requireDatabase, githubRoutes);
app.use('/api/analytics', requireDatabase, analyticsRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

app.use((error, _req, res, _next) => {
  if (error.message === 'Origin not allowed') {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'PDF files must be 5 MB or smaller.'
      : 'The uploaded file could not be processed.';
    return res.status(statusCode).json({ message });
  }
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Request body contains invalid JSON.' });
  }

  console.error('Unhandled API error:', error);
  return res.status(500).json({ message: 'Unexpected server error.' });
});

export default app;
