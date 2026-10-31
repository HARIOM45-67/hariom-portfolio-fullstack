import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import GitHubSnapshot from '../src/models/GitHubSnapshot.js';

let mongo;
const previousUsername = process.env.GITHUB_USERNAME;
const username = 'hariom-cache-recovery';

beforeAll(async () => {
  process.env.GITHUB_USERNAME = username;
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await GitHubSnapshot.init();
});

beforeEach(async () => {
  await GitHubSnapshot.deleteMany({});
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"API rate limit exceeded"}', {
    status: 429,
    headers: { 'Retry-After': '60' }
  })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (previousUsername === undefined) delete process.env.GITHUB_USERNAME;
  else process.env.GITHUB_USERNAME = previousUsername;
});

describe('persisted GitHub snapshot fallback', () => {
  it('serves previously saved public repositories when GitHub is rate-limited', async () => {
    await GitHubSnapshot.create({
      username,
      profile: {
        login: 'Hariom-Cache-Recovery',
        name: 'Hariom Tiwari',
        bio: 'Software developer',
        avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4',
        html_url: `https://github.com/${username}`,
        public_repos: 1,
        followers: 0,
        following: 0,
        created_at: '2020-01-01T00:00:00Z'
      },
      repositories: [{
        id: 98765,
        name: 'hariom-portfolio',
        description: 'A portfolio project.',
        language: 'JavaScript',
        stargazers_count: 2,
        forks_count: 1,
        html_url: `https://github.com/${username}/hariom-portfolio`,
        updated_at: '2026-10-30T00:00:00Z'
      }],
      fetchedAt: new Date('2026-10-30T00:00:00Z')
    });

    const response = await request(app).get('/api/github/repos');

    expect(response.status).toBe(200);
    expect(response.headers['x-github-cache']).toBe('stale');
    expect(response.headers.warning).toContain('Response is stale');
    expect(response.body.repositories).toMatchObject([{
      name: 'hariom-portfolio',
      html_url: `https://github.com/${username}/hariom-portfolio`
    }]);
  });
});
