import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { MongoMemoryServer } from 'mongodb-memory-server';
import contactRoutes from './routes/contact.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',').map(value => value.trim()) || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Hariom Portfolio API' }));
app.use('/api/contact', contactRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Unexpected server error.' });
});

async function start() {
  let mongoUri = process.env.MONGODB_URI;
  let mongoMemoryServer = null;

  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    } else {
      mongoMemoryServer = await MongoMemoryServer.create();
      mongoUri = mongoMemoryServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to in-memory MongoDB for local development');
    }

    app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
  } catch (error) {
    console.warn('Primary MongoDB connection failed. Falling back to in-memory MongoDB for local development.');
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoMemoryServer.getUri());
      console.log('Connected to in-memory MongoDB for local development');
      app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
    } catch (fallbackError) {
      console.error('MongoDB connection failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

start();