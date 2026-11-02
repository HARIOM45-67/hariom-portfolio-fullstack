import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import Certificate from '../src/models/Certificate.js';

vi.mock('../src/services/cloudinary.js', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadCertificate: vi.fn(async (_buffer, publicId, mediaType) => ({
      secure_url: `https://res.cloudinary.com/test/${mediaType === 'application/pdf' ? 'raw' : 'image'}/upload/${publicId}`
    })),
    deleteCertificate: vi.fn(async () => ({ result: 'ok' }))
  };
});

let mongo;
const previousSecret = process.env.JWT_SECRET;
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), Certificate.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), Certificate.deleteMany({})]);
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

describe('certificate API', () => {
  it('shows no certificate unless an admin has published one', async () => {
    const response = await request(app).get('/api/certificates');

    expect(response.status).toBe(200);
    expect(response.body.certificates).toEqual([]);
  });

  it('requires admin authentication before certificate upload', async () => {
    const response = await request(app)
      .post('/api/certificates')
      .set('Origin', testOrigin)
      .field('title', 'Certificate')
      .field('issuer', 'Issuer')
      .field('issueDate', '2026-01-02')
      .attach('certificate', Buffer.from('%PDF-1.7\n'), { filename: 'certificate.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(401);
  });

  it('rejects unauthenticated updates and deletions without changing certificates', async () => {
    const certificate = await Certificate.create({
      title: 'Verified certificate',
      issuer: 'Verified issuer',
      issueDate: '2026-01-02',
      publicId: 'portfolio/certificates/test.pdf',
      secureUrl: 'https://res.cloudinary.com/test/raw/upload/portfolio/certificates/test.pdf',
      originalName: 'certificate.pdf',
      mediaType: 'application/pdf',
      bytes: 8
    });

    const update = await request(app)
      .put(`/api/certificates/${certificate.id}`)
      .set('Origin', testOrigin)
      .field('title', 'Unauthorized update')
      .field('issuer', 'Verified issuer')
      .field('issueDate', '2026-01-02')
      .field('credentialUrl', '')
      .field('displayOrder', '0');
    const deletion = await request(app)
      .delete(`/api/certificates/${certificate.id}`)
      .set('Origin', testOrigin);

    expect(update.status).toBe(401);
    expect(deletion.status).toBe(401);
    expect(await Certificate.findById(certificate.id).then(record => record.title)).toBe('Verified certificate');
  });

  it('rejects authenticated updates and deletions from untrusted origins', async () => {
    const agent = await authenticatedAgent();
    const certificate = await Certificate.create({
      title: 'Verified certificate',
      issuer: 'Verified issuer',
      issueDate: '2026-01-02',
      publicId: 'portfolio/certificates/test.pdf',
      secureUrl: 'https://res.cloudinary.com/test/raw/upload/portfolio/certificates/test.pdf',
      originalName: 'certificate.pdf',
      mediaType: 'application/pdf',
      bytes: 8
    });

    const update = await agent
      .put(`/api/certificates/${certificate.id}`)
      .set('Origin', 'https://unauthorized.example')
      .field('title', 'Rejected update')
      .field('issuer', 'Verified issuer')
      .field('issueDate', '2026-01-02')
      .field('credentialUrl', '')
      .field('displayOrder', '0');
    const deletion = await agent
      .delete(`/api/certificates/${certificate.id}`)
      .set('Origin', 'https://unauthorized.example');

    expect(update.status).toBe(403);
    expect(deletion.status).toBe(403);
    expect(await Certificate.findById(certificate.id).then(record => record.title)).toBe('Verified certificate');
  });

  it('validates certificate metadata and file signatures before publishing', async () => {
    const agent = await authenticatedAgent();
    const badDate = await agent
      .post('/api/certificates')
      .set('Origin', testOrigin)
      .field('title', 'Certificate')
      .field('issuer', 'Issuer')
      .field('issueDate', '2026-02-31')
      .attach('certificate', Buffer.from('%PDF-1.7\n'), { filename: 'certificate.pdf', contentType: 'application/pdf' });
    expect(badDate.status).toBe(400);

    const badSignature = await agent
      .post('/api/certificates')
      .set('Origin', testOrigin)
      .field('title', 'Certificate')
      .field('issuer', 'Issuer')
      .field('issueDate', '2026-01-02')
      .attach('certificate', Buffer.from('not a PDF'), { filename: 'certificate.pdf', contentType: 'application/pdf' });
    expect(badSignature.status).toBe(400);

    const published = await agent
      .post('/api/certificates')
      .set('Origin', testOrigin)
      .field('title', 'Certificate')
      .field('issuer', 'Issuer')
      .field('issueDate', '2026-01-02')
      .field('credentialUrl', 'https://issuer.example/credential/123')
      .attach('certificate', Buffer.from('%PDF-1.7\n'), { filename: 'certificate.pdf', contentType: 'application/pdf' });
    expect(published.status).toBe(201);
    expect(published.body.certificate).toMatchObject({
      title: 'Certificate',
      issuer: 'Issuer',
      issueDate: '2026-01-02',
      credentialUrl: 'https://issuer.example/credential/123',
      mediaType: 'application/pdf'
    });

    const updated = await agent
      .put(`/api/certificates/${published.body.certificate.id}`)
      .set('Origin', testOrigin)
      .field('title', 'Updated certificate')
      .field('issuer', 'Issuer')
      .field('issueDate', '2026-01-02')
      .field('credentialUrl', '')
      .field('displayOrder', '1')
      .attach('certificate', Buffer.from([0xff, 0xd8, 0xff, 0x00]), { filename: 'certificate.jpg', contentType: 'image/jpeg' });
    expect(updated.status).toBe(200);
    expect(updated.body.certificate).toMatchObject({
      title: 'Updated certificate',
      mediaType: 'image/jpeg',
      originalName: 'certificate.jpg'
    });
    expect((await request(app).get('/api/certificates')).body.certificates).toHaveLength(1);

    const deleted = await agent
      .delete(`/api/certificates/${published.body.certificate.id}`)
      .set('Origin', testOrigin);
    expect(deleted.status).toBe(204);
    expect((await request(app).get('/api/certificates')).body.certificates).toEqual([]);
  });
});
