import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { connectDatabase } from '../src/config/database.js';
import app from '../src/app.js';
import GitHubSnapshot from '../src/models/GitHubSnapshot.js';

let mongo;
const previousUsername = process.env.GITHUB_USERNAME;

const profile = {
  login: 'HARIOM45-67',
  name: null,
  bio: null,
  avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4',
  html_url: 'https://github.com/HARIOM45-67',
  public_repos: 1,
  followers: 0,
  following: 0,
  created_at: '2026-08-01T05:24:42Z'
};

const repository = {
  id: 98765,
  name: 'hariom-ai',
  description: 'Hariom AI – My personal AI project',
  language: 'JavaScript',
  homepage: 'https://hariom-ai.vercel.app',
  html_url: 'https://github.com/HARIOM45-67/hariom-ai',
  stargazers_count: 0,
  forks_count: 0,
  updated_at: '2026-10-31T20:05:12Z',
  private: false,
  fork: false
};
const privateRepository = {
  ...repository,
  id: 98766,
  name: 'private-test-repository',
  private: true
};

beforeAll(async () => {
  delete process.env.GITHUB_USERNAME;
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await GitHubSnapshot.init();
});

beforeEach(async () => {
  await GitHubSnapshot.deleteMany({});
  vi.stubGlobal('fetch', vi.fn(async input => {
    const url = String(input);
    const body = url.includes('/repos?') ? [repository, privateRepository] : profile;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }));
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

describe('GitHub API proxy', () => {
  it('loads HARIOM45-67 when no GitHub username override is configured', async () => {
    const [profileResponse, repositoriesResponse] = await Promise.all([
      request(app).get('/api/github/profile'),
      request(app).get('/api/github/repos')
    ]);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.profile).toMatchObject({
      login: 'HARIOM45-67',
      html_url: 'https://github.com/HARIOM45-67'
    });
    expect(repositoriesResponse.status).toBe(200);
    expect(repositoriesResponse.body.repositories).toMatchObject([{
      name: 'hariom-ai',
      description: 'Hariom AI – My personal AI project',
      language: 'JavaScript',
      homepage: 'https://hariom-ai.vercel.app/',
      html_url: 'https://github.com/HARIOM45-67/hariom-ai'
    }]);
    expect(repositoriesResponse.body.repositories).toHaveLength(1);
    const requestedUrls = fetch.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toContain('https://api.github.com/users/HARIOM45-67');
    expect(requestedUrls).toContain('https://api.github.com/users/HARIOM45-67/repos?sort=updated&per_page=100&type=owner');
  });
});
