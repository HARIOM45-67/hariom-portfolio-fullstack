import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import ContactQuery from '../src/models/Contact.js';

let mongo;
const previous = {
  jwtSecret: process.env.JWT_SECRET,
  smtpHost: process.env.SMTP_HOST,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  contactReceiver: process.env.CONTACT_RECEIVER
};
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.CONTACT_RECEIVER;
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), ContactQuery.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), ContactQuery.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previous.jwtSecret;
  if (previous.smtpHost === undefined) delete process.env.SMTP_HOST;
  else process.env.SMTP_HOST = previous.smtpHost;
  if (previous.smtpUser === undefined) delete process.env.SMTP_USER;
  else process.env.SMTP_USER = previous.smtpUser;
  if (previous.smtpPass === undefined) delete process.env.SMTP_PASS;
  else process.env.SMTP_PASS = previous.smtpPass;
  if (previous.contactReceiver === undefined) delete process.env.CONTACT_RECEIVER;
  else process.env.CONTACT_RECEIVER = previous.contactReceiver;
});

async function submitQuery(overrides = {}) {
  return request(app).post('/api/queries').send({
    name: 'Jane Visitor',
    email: 'JANE@example.com',
    subject: 'Portfolio question',
    message: 'I would like to learn more about your work.',
    ...overrides
  });
}

async function authenticatedAgent() {
  await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });
  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/login')
    .set('Origin', testOrigin)
    .send({ email: 'admin@example.com', password: 'a-strong-password-123' });
  expect(login.status).toBe(200);
  return agent;
}

describe('contact query API', () => {
  it('validates, sanitizes, persists submissions, and reports unconfigured email', async () => {
    const response = await submitQuery({ name: '<b>Jane</b>\r\n', subject: 'Question\r\n' });

    expect(response.status).toBe(201);
    expect(response.body.queryId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.body.notifications).toEqual({ admin: 'not_configured', visitor: 'not_configured' });
    const stored = await ContactQuery.findOne({ queryId: response.body.queryId });
    expect(stored.name).toBe('Jane');
    expect(stored.email).toBe('jane@example.com');
    expect(stored.subject).toBe('Question');
    expect(stored.createdAt).toBeInstanceOf(Date);
  });

  it('rejects invalid input without persisting it', async () => {
    const response = await submitQuery({ subject: '', email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(await ContactQuery.countDocuments()).toBe(0);
  });

  it('protects query management and supports search, read status, details, and deletion', async () => {
    const unauthorized = await request(app).get('/api/queries');
    expect(unauthorized.status).toBe(401);

    const first = await submitQuery({ name: 'First Visitor', subject: 'First question' });
    const second = await submitQuery({ name: 'Second Visitor', subject: 'Second question' });
    const agent = await authenticatedAgent();

    const search = await agent.get('/api/queries?q=First&page=1&limit=1');
    expect(search.status).toBe(200);
    expect(search.body.items).toHaveLength(1);
    expect(search.body.items[0].queryId).toBe(first.body.queryId);
    expect(search.body.pagination).toMatchObject({ page: 1, limit: 1, total: 1, pages: 1 });

    const escapedSearch = await agent.get('/api/queries?q=.*');
    expect(escapedSearch.body.pagination.total).toBe(0);

    const detail = await agent.get(`/api/queries/${second.body.queryId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.query.subject).toBe('Second question');

    const marked = await agent
      .patch(`/api/queries/${second.body.queryId}`)
      .set('Origin', testOrigin)
      .send({ isRead: true });
    expect(marked.status).toBe(200);
    expect(marked.body.query.isRead).toBe(true);

    const deleted = await agent
      .delete(`/api/queries/${second.body.queryId}`)
      .set('Origin', testOrigin);
    expect(deleted.status).toBe(204);
    expect((await agent.get(`/api/queries/${second.body.queryId}`)).status).toBe(404);
  });
});
