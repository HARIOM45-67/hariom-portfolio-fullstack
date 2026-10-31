import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';

let mongo;
const previousSecret = process.env.JWT_SECRET;
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Admin.init();
});

beforeEach(async () => {
  await Admin.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

describe('admin authentication', () => {
  it('reuses one MongoDB connection for concurrent requests and health checks', async () => {
    await mongoose.disconnect();
    const connect = vi.spyOn(mongoose, 'connect');

    try {
      const [first, second] = await Promise.all([
        connectDatabase(mongo.getUri()),
        connectDatabase(mongo.getUri())
      ]);

      expect(first).toBe(mongoose.connection);
      expect(second).toBe(first);
      expect(connect).toHaveBeenCalledTimes(1);
      expect((await request(app).get('/api/health')).body.database).toBe('connected');
      expect(connect).toHaveBeenCalledTimes(1);
    } finally {
      connect.mockRestore();
    }
  });

  it('sets an HTTP-only cookie, authenticates the admin, and revokes the session on logout', async () => {
    await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });
    const agent = request.agent(app);

    const login = await agent
      .post('/api/auth/login')
      .set('Origin', testOrigin)
      .send({ email: 'ADMIN@example.com', password: 'a-strong-password-123' });

    expect(login.status).toBe(200);
    expect(login.body.admin.email).toBe('admin@example.com');
    expect(login.body.admin.password).toBeUndefined();
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Lax');

    const authenticated = await agent.get('/api/auth/me');
    expect(authenticated.status).toBe(200);
    expect(authenticated.body.admin.email).toBe('admin@example.com');

    const logout = await agent.post('/api/auth/logout').set('Origin', testOrigin);
    expect(logout.status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects invalid credentials and disallowed login origins', async () => {
    await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });

    const invalidLogin = await request(app)
      .post('/api/auth/login')
      .set('Origin', testOrigin)
      .send({ email: 'admin@example.com', password: 'incorrect-password' });
    expect(invalidLogin.status).toBe(401);
    expect(invalidLogin.body.message).toBe('Invalid email or password.');

    const disallowedOrigin = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://unauthorized.example')
      .send({ email: 'admin@example.com', password: 'a-strong-password-123' });
    expect(disallowedOrigin.status).toBe(403);
  });
});
