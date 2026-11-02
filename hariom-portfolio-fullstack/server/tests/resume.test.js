import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import Admin from '../src/models/Admin.js';
import Resume from '../src/models/Resume.js';

let mongo;
const previous = {
  jwtSecret: process.env.JWT_SECRET,
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudKey: process.env.CLOUDINARY_API_KEY,
  cloudSecret: process.env.CLOUDINARY_API_SECRET
};
const testOrigin = 'http://localhost:5173';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), Resume.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), Resume.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (previous.jwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previous.jwtSecret;
  if (previous.cloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
  else process.env.CLOUDINARY_CLOUD_NAME = previous.cloudName;
  if (previous.cloudKey === undefined) delete process.env.CLOUDINARY_API_KEY;
  else process.env.CLOUDINARY_API_KEY = previous.cloudKey;
  if (previous.cloudSecret === undefined) delete process.env.CLOUDINARY_API_SECRET;
  else process.env.CLOUDINARY_API_SECRET = previous.cloudSecret;
});

afterEach(() => {
  vi.unstubAllGlobals();
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

describe('resume API', () => {
  it('reports the absence of an unpublished resume without claiming a download exists', async () => {
    const metadata = await request(app).get('/api/resume');
    const download = await request(app).get('/api/resume/download');

    expect(metadata.status).toBe(200);
    expect(metadata.body.resume).toBeNull();
    expect(download.status).toBe(404);
  });

  it('serves the published PDF inline or as a named attachment', async () => {
    const pdf = Buffer.from('%PDF-1.7\nportfolio resume');
    await Resume.create({
      key: 'current',
      publicId: 'portfolio/resumes/test',
      secureUrl: 'https://res.cloudinary.com/example/raw/upload/portfolio/resumes/test.pdf',
      originalName: 'Hariom Tiwari Resume.pdf',
      bytes: pdf.length
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdf, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(pdf.length) }
    })));

    const view = await request(app).get('/api/resume/download');
    expect(view.status).toBe(200);
    expect(view.headers['content-type']).toContain('application/pdf');
    expect(view.headers['content-disposition']).toContain('inline');
    expect(view.body).toEqual(pdf);

    const download = await request(app).get('/api/resume/download?attachment=1');
    expect(download.status).toBe(200);
    expect(download.headers['content-disposition']).toContain('attachment');
    expect(download.headers['content-disposition']).toContain('Hariom%20Tiwari%20Resume.pdf');
  });

  it('rejects resume URLs with an untrusted host without fetching them', async () => {
    await Resume.create({
      key: 'current',
      publicId: 'portfolio/resumes/test',
      secureUrl: 'https://files.example/resume.pdf',
      originalName: 'resume.pdf',
      bytes: 12
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/api/resume/download');

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects redirects from the resume host', async () => {
    await Resume.create({
      key: 'current',
      publicId: 'portfolio/resumes/test',
      secureUrl: 'https://res.cloudinary.com/example/raw/upload/resume.pdf',
      originalName: 'resume.pdf',
      bytes: 12
    });
    const fetchMock = vi.fn(async (_url, options) => {
      expect(options.redirect).toBe('error');
      return new Response(null, { status: 302, headers: { Location: 'https://files.example/resume.pdf' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/api/resume/download');

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized resume responses based on content length and body size', async () => {
    await Resume.create({
      key: 'current',
      publicId: 'portfolio/resumes/test',
      secureUrl: 'https://res.cloudinary.com/example/raw/upload/resume.pdf',
      originalName: 'resume.pdf',
      bytes: 12
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('%PDF-1.7', {
        status: 200,
        headers: { 'Content-Length': String(5 * 1024 * 1024 + 1) }
      }))
      .mockResolvedValueOnce(new Response(Buffer.concat([
        Buffer.from('%PDF-1.7'),
        Buffer.alloc(5 * 1024 * 1024)
      ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const advertisedSize = await request(app).get('/api/resume/download');
    const actualSize = await request(app).get('/api/resume/download');

    expect(advertisedSize.status).toBe(502);
    expect(actualSize.status).toBe(502);
  });

  it('rejects resume responses without a PDF signature', async () => {
    await Resume.create({
      key: 'current',
      publicId: 'portfolio/resumes/test',
      secureUrl: 'https://res.cloudinary.com/example/raw/upload/resume.pdf',
      originalName: 'resume.pdf',
      bytes: 12
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not a PDF', { status: 200 })));

    const response = await request(app).get('/api/resume/download');

    expect(response.status).toBe(502);
  });

  it('requires an authenticated admin and validates PDF type, signature, and size', async () => {
    const unauthenticated = await request(app)
      .post('/api/resume')
      .set('Origin', testOrigin)
      .attach('resume', Buffer.from('%PDF-1.7'), 'resume.pdf');
    expect(unauthenticated.status).toBe(401);

    const agent = await authenticatedAgent();
    const wrongType = await agent
      .post('/api/resume')
      .set('Origin', testOrigin)
      .attach('resume', Buffer.from('not a pdf'), { filename: 'resume.txt', contentType: 'text/plain' });
    expect(wrongType.status).toBe(400);

    const invalidSignature = await agent
      .post('/api/resume')
      .set('Origin', testOrigin)
      .attach('resume', Buffer.from('not a pdf'), { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(invalidSignature.status).toBe(400);

    const tooLarge = await agent
      .post('/api/resume')
      .set('Origin', testOrigin)
      .attach('resume', Buffer.alloc(5 * 1024 * 1024 + 1, 0x41), { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(tooLarge.status).toBe(413);
  });

  it('reports Cloudinary as unconfigured rather than accepting an upload', async () => {
    const agent = await authenticatedAgent();
    const response = await agent
      .post('/api/resume')
      .set('Origin', testOrigin)
      .attach('resume', Buffer.from('%PDF-1.7\n'), { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Cloudinary resume storage is not configured.');
    expect(await Resume.countDocuments()).toBe(0);
  });
});
