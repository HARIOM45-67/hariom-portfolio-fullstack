import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Admin from '../src/models/Admin.js';
import ContactQuery from '../src/models/Contact.js';
import Project from '../src/models/Project.js';
import Resume from '../src/models/Resume.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([Admin.init(), ContactQuery.init(), Project.init(), Resume.init()]);
});

beforeEach(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    ContactQuery.deleteMany({}),
    Project.deleteMany({}),
    Resume.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('Mongoose models', () => {
  it('hashes admin passwords and enforces unique normalized email', async () => {
    const admin = await Admin.create({ email: 'ADMIN@example.com', password: 'a-strong-password-123' });

    expect(admin.email).toBe('admin@example.com');
    expect(admin.password).not.toBe('a-strong-password-123');
    expect(await admin.verifyPassword('a-strong-password-123')).toBe(true);

    const stored = await Admin.findOne({ email: admin.email }).select('+password');
    expect(stored.password).toBe(admin.password);
    await expect(Admin.create({ email: admin.email, password: 'another-strong-password' }))
      .rejects.toMatchObject({ code: 11000 });
  });

  it('creates contact query identifiers and timestamps', async () => {
    const query = await ContactQuery.create({
      name: 'Hariom Tiwari',
      email: 'VISITOR@example.com',
      subject: 'Portfolio question',
      message: 'Please share more about this portfolio.'
    });

    expect(query.queryId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(query.email).toBe('visitor@example.com');
    expect(query.isRead).toBe(false);
    expect(query.createdAt).toBeInstanceOf(Date);
    expect(query.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects invalid resume sizes and project records', async () => {
    await expect(Resume.create({
      publicId: 'resume/current',
      secureUrl: 'https://res.cloudinary.com/example/raw/upload/resume.pdf',
      originalName: 'resume.pdf',
      bytes: 5 * 1024 * 1024 + 1
    })).rejects.toMatchObject({ name: 'ValidationError' });

    await expect(Project.create({
      name: 'X',
      slug: 'x',
      description: 'short'
    })).rejects.toMatchObject({ name: 'ValidationError' });
  });
});
