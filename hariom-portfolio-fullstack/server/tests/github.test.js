import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

const previousUsername = process.env.GITHUB_USERNAME;

beforeAll(() => {
  delete process.env.GITHUB_USERNAME;
});

afterAll(() => {
  if (previousUsername === undefined) delete process.env.GITHUB_USERNAME;
  else process.env.GITHUB_USERNAME = previousUsername;
});

describe('GitHub API proxy', () => {
  it('reports an unconfigured profile instead of returning placeholder data', async () => {
    const [profile, repositories] = await Promise.all([
      request(app).get('/api/github/profile'),
      request(app).get('/api/github/repos')
    ]);

    expect(profile.status).toBe(503);
    expect(profile.body.message).toBe('GitHub integration is not configured.');
    expect(repositories.status).toBe(503);
    expect(repositories.body.repositories).toBeUndefined();
  });
});
