import { describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';

describe('API foundation', () => {
  it('reports the database as unavailable when it is not connected', async () => {
    await mongoose.disconnect();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'unavailable',
      database: 'disconnected'
    });
  });

  it('rejects requests from origins outside the configured allowlist', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://unauthorized.example');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Request origin is not allowed.');
  });

  it('returns a structured 404 for unknown API routes', async () => {
    const response = await request(app).get('/api/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('API endpoint not found.');
  });
});
