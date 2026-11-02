import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import Experience from '../src/models/Experience.js';

let mongo;
const previousSecret = process.env.JWT_SECRET;
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), Experience.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), Experience.deleteMany({})]);
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

describe('experience API', () => {
  it('presents only the confirmed Auspify organization when no details are saved', async () => {
    const response = await request(app).get('/api/experience');

    expect(response.status).toBe(200);
    expect(response.body.experience).toEqual([{
      id: '',
      organization: 'Auspify Technologies',
      position: '',
      description: '',
      startDate: '',
      endDate: '',
      displayOrder: 0
    }]);
  });

  it('requires admin authentication and allows confirmed details to be edited', async () => {
    const details = {
      organization: 'Auspify Technologies',
      position: 'Verified role',
      description: 'Responsibilities entered by the administrator.',
      startDate: '',
      endDate: '',
      displayOrder: 0
    };
    const unauthorized = await request(app)
      .post('/api/experience')
      .set('Origin', testOrigin)
      .send(details);
    expect(unauthorized.status).toBe(401);

    const agent = await authenticatedAgent();
    const created = await agent
      .post('/api/experience')
      .set('Origin', testOrigin)
      .send(details);
    expect(created.status).toBe(201);
    expect(created.body.experience).toMatchObject(details);

    const updated = await agent
      .put(`/api/experience/${created.body.experience.id}`)
      .set('Origin', testOrigin)
      .send({ ...details, position: 'Updated confirmed role' });
    expect(updated.status).toBe(200);
    expect(updated.body.experience.position).toBe('Updated confirmed role');
    expect((await request(app).get('/api/experience')).body.experience).toHaveLength(1);
  });

  it('rejects unauthenticated updates and deletions without changing experience records', async () => {
    const experience = await Experience.create({
      organization: 'Auspify Technologies',
      position: 'Verified role'
    });

    const update = await request(app)
      .put(`/api/experience/${experience.id}`)
      .set('Origin', testOrigin)
      .send({
        organization: 'Auspify Technologies',
        position: 'Unauthorized update',
        description: '',
        startDate: '',
        endDate: '',
        displayOrder: 0
      });
    const deletion = await request(app)
      .delete(`/api/experience/${experience.id}`)
      .set('Origin', testOrigin);

    expect(update.status).toBe(401);
    expect(deletion.status).toBe(401);
    expect(await Experience.findById(experience.id).then(record => record.position)).toBe('Verified role');
  });

  it('rejects authenticated updates and deletions from untrusted origins', async () => {
    const agent = await authenticatedAgent();
    const experience = await Experience.create({
      organization: 'Auspify Technologies',
      position: 'Verified role'
    });

    const update = await agent
      .put(`/api/experience/${experience.id}`)
      .set('Origin', 'https://unauthorized.example')
      .send({
        organization: 'Auspify Technologies',
        position: 'Rejected update',
        description: '',
        startDate: '',
        endDate: '',
        displayOrder: 0
      });
    const deletion = await agent
      .delete(`/api/experience/${experience.id}`)
      .set('Origin', 'https://unauthorized.example');

    expect(update.status).toBe(403);
    expect(deletion.status).toBe(403);
    expect(await Experience.findById(experience.id).then(record => record.position)).toBe('Verified role');
  });
});
