import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import { authCookieName } from '../src/middleware/auth.js';

let mongo;
const previousSecret = process.env.JWT_SECRET;
const previousNodeEnv = process.env.NODE_ENV;
const testOrigin = 'http://localhost:5173';
const productionOrigin = 'https://hariom-portfolio-fullstack.vercel.app';

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
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
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
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const token = cookie.slice(cookie.indexOf('=') + 1);
    const payload = jwt.decode(token);
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);

    const authenticated = await agent.get('/api/auth/me');
    expect(authenticated.status).toBe(200);
    expect(authenticated.body.admin.email).toBe('admin@example.com');

    const logout = await agent.post('/api/auth/logout').set('Origin', testOrigin);
    expect(logout.status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('rejects an expired signed session token', async () => {
    const admin = await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });
    const expiredToken = jwt.sign(
      { ver: admin.tokenVersion },
      process.env.JWT_SECRET,
      { subject: admin.id, issuer: 'hariom-potofolio', algorithm: 'HS256', expiresIn: -1 }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${authCookieName}=${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it('sets production cookies with Secure, HttpOnly, and SameSite=None', async () => {
    await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });
    const previousTestNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const login = await request(app)
        .post('/api/auth/login')
        .set('Origin', productionOrigin)
        .send({ email: 'admin@example.com', password: 'a-strong-password-123' });

      expect(login.status).toBe(200);
      expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(login.headers['set-cookie'][0]).toContain('Secure');
      expect(login.headers['set-cookie'][0]).toContain('SameSite=None');
      expect(login.headers['set-cookie'][0]).toContain('Path=/api');
      expect(login.headers['set-cookie'][0]).toContain('Max-Age=28800');
    } finally {
      if (previousTestNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousTestNodeEnv;
    }
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

  it('logs only the versioned runtime lookup metadata when an admin lookup fails', async () => {
    await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });
    const previousDiagnostics = process.env.ADMIN_LOGIN_DIAGNOSTICS;
    process.env.ADMIN_LOGIN_DIAGNOSTICS = 'true';
    const diagnosticLog = vi.spyOn(console, 'info').mockImplementation(() => {});

    try {
      const missingAdmin = await request(app)
        .post('/api/auth/login')
        .set('Origin', testOrigin)
        .send({ email: 'missing@example.com', password: 'a-strong-password-123' });
      expect(missingAdmin.status).toBe(401);

      const passwordMismatch = await request(app)
        .post('/api/auth/login')
        .set('Origin', testOrigin)
        .send({ email: 'ADMIN@example.com', password: 'incorrect-password' });
      expect(passwordMismatch.status).toBe(401);

      expect(diagnosticLog).toHaveBeenCalledTimes(1);
      expect(diagnosticLog).toHaveBeenCalledWith('ADMIN_LOGIN_DIAGNOSTIC_V2', {
        activeDatabase: mongoose.connection.name,
        modelDatabase: Admin.db.name,
        collection: Admin.collection.collectionName,
        count: 1,
        connectionMatch: true,
        adminFound: false
      });

      const loggedFields = JSON.stringify(diagnosticLog.mock.calls);
      expect(loggedFields).not.toContain('admin@example.com');
      expect(loggedFields).not.toContain('missing@example.com');
      expect(loggedFields).not.toContain('a-strong-password-123');
      expect(loggedFields).not.toContain('incorrect-password');
      expect(loggedFields).not.toMatch(/\$2[aby]\$/);
    } finally {
      diagnosticLog.mockRestore();
      if (previousDiagnostics === undefined) delete process.env.ADMIN_LOGIN_DIAGNOSTICS;
      else process.env.ADMIN_LOGIN_DIAGNOSTICS = previousDiagnostics;
    }
  });
});
