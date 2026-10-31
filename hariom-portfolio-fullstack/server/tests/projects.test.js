import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import Project from '../src/models/Project.js';

let mongo;
const previousSecret = process.env.JWT_SECRET;
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), Project.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), Project.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

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

describe('project API', () => {
  it('returns no invented projects before any are published', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(200);
    expect(response.body.projects).toEqual([]);
  });

  it('restricts project management to admins and supports create, update, and delete', async () => {
    const projectDetails = {
      name: 'Portfolio API',
      description: 'A project record created for the portfolio integration test.',
      problemSolved: 'Makes project details easy to publish and maintain.',
      imageUrl: 'https://example.com/portfolio-api.png',
      stack: ['React', 'Express'],
      liveUrl: 'https://example.com/demo',
      repoUrl: 'https://github.com/example/portfolio-api',
      featured: true,
      displayOrder: 1
    };
    const unauthorized = await request(app)
      .post('/api/projects')
      .set('Origin', testOrigin)
      .send(projectDetails);
    expect(unauthorized.status).toBe(401);

    const agent = await authenticatedAgent();
    const created = await agent
      .post('/api/projects')
      .set('Origin', testOrigin)
      .send(projectDetails);
    expect(created.status).toBe(201);
    expect(created.body.project.slug).toBe('portfolio-api');

    const listed = await request(app).get('/api/projects');
    expect(listed.body.projects).toHaveLength(1);
    expect(listed.body.projects[0].name).toBe('Portfolio API');
    expect(listed.body.projects[0]).toMatchObject({
      problemSolved: projectDetails.problemSolved,
      imageUrl: projectDetails.imageUrl
    });

    const updated = await agent
      .put(`/api/projects/${created.body.project.id}`)
      .set('Origin', testOrigin)
      .send({ ...projectDetails, name: 'Updated Portfolio API' });
    expect(updated.status).toBe(200);
    expect(updated.body.project.name).toBe('Updated Portfolio API');

    const deleted = await agent
      .delete(`/api/projects/${created.body.project.id}`)
      .set('Origin', testOrigin);
    expect(deleted.status).toBe(204);
    expect((await request(app).get('/api/projects')).body.projects).toEqual([]);
  });

  it('rejects insecure URLs and invalid identifiers', async () => {
    const agent = await authenticatedAgent();
    const invalid = await agent
      .post('/api/projects')
      .set('Origin', testOrigin)
      .send({
        name: 'Unsafe URL project',
        description: 'A long enough description for this invalid project record.',
        liveUrl: 'http://example.com'
      });
    expect(invalid.status).toBe(400);
    expect((await agent.put('/api/projects/not-an-object-id').set('Origin', testOrigin).send({})).status).toBe(400);
  });
});
