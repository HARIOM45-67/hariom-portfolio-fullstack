import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import ContactQuery from '../src/models/Contact.js';
import Project from '../src/models/Project.js';
import PortfolioView from '../src/models/PortfolioView.js';

let mongo;
const previousSecret = process.env.JWT_SECRET;
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), ContactQuery.init(), PortfolioView.init()]);
});

beforeEach(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    ContactQuery.deleteMany({}),
    Project.deleteMany({}),
    PortfolioView.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

describe('privacy-first portfolio analytics', () => {
  it('accepts only valid, anonymous section events and deduplicates daily views', async () => {
    const visitorId = 'c6240cc4-3c72-4d4a-a9ca-0ff06c4a31da';
    const first = await request(app).post('/api/analytics/view').send({ visitorId, section: 'projects' });
    const professionalProfile = await request(app).post('/api/analytics/view').send({ visitorId, section: 'professional-profiles' });
    const repeated = await request(app).post('/api/analytics/view').send({ visitorId, section: 'projects' });
    const projectView = await request(app).post('/api/analytics/view').send({ visitorId, project: 'portfolio-api' });
    const repeatedProjectView = await request(app).post('/api/analytics/view').send({ visitorId, project: 'portfolio-api' });
    const invalid = await request(app).post('/api/analytics/view').send({ visitorId, section: 'email-address' });

    expect(first.status).toBe(202);
    expect(professionalProfile.status).toBe(202);
    expect(repeated.status).toBe(202);
    expect(projectView.status).toBe(202);
    expect(repeatedProjectView.status).toBe(202);
    expect(invalid.status).toBe(400);
    expect(await PortfolioView.countDocuments({})).toBe(3);
    expect(PortfolioView.schema.path('ipAddress')).toBeUndefined();
  });

  it('keeps summaries admin-only and reports visitor, section and contact totals', async () => {
    const unauthorized = await request(app).get('/api/analytics/summary');
    expect(unauthorized.status).toBe(401);

    const visitorId = 'c6240cc4-3c72-4d4a-a9ca-0ff06c4a31da';
    await PortfolioView.create([
      { visitorId, section: 'projects', day: new Date().toISOString().slice(0, 10) },
      { visitorId, section: 'github', day: new Date().toISOString().slice(0, 10) },
      { visitorId, project: 'portfolio-api', day: new Date().toISOString().slice(0, 10) }
    ]);
    await Project.create({
      name: 'Portfolio API',
      slug: 'portfolio-api',
      description: 'A project record used to verify analytics summaries.'
    });
    await ContactQuery.create({
      name: 'Portfolio Visitor',
      email: 'visitor@example.com',
      subject: 'Portfolio feedback',
      message: 'A sufficiently long test message for analytics.'
    });
    await Admin.create({ email: 'admin@example.com', password: 'a-strong-password-123' });
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .set('Origin', testOrigin)
      .send({ email: 'admin@example.com', password: 'a-strong-password-123' });
    expect(login.status).toBe(200);

    const summary = await agent.get('/api/analytics/summary');
    expect(summary.status).toBe(200);
    expect(summary.body).toMatchObject({
      periodDays: 30,
      visitors: 1,
      pageViews: 2,
      contactSubmissions: 1
    });
    expect(summary.body.popularSections).toEqual([
      { section: 'github', views: 1 },
      { section: 'projects', views: 1 }
    ]);
    expect(summary.body.popularProjects).toEqual([
      { slug: 'portfolio-api', name: 'Portfolio API', views: 1 }
    ]);
  });
});
