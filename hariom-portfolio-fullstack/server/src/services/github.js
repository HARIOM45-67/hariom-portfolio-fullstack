import HttpError from '../utils/HttpError.js';
import GitHubSnapshot from '../models/GitHubSnapshot.js';

const cacheDuration = 5 * 60 * 1000;
const staleDuration = 60 * 60 * 1000;
let cache;
let inFlight;

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Hariom-Tiwari-Portfolio'
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function getJson(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw new HttpError(502, 'GitHub could not be reached. Please try again later.');
  }

  if (response.status === 403 || response.status === 429) {
    const error = new HttpError(503, 'GitHub API rate limit reached. Please try again later.');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) error.retryAfter = retryAfter;
    throw error;
  }
  if (response.status === 404) throw new HttpError(404, 'The configured GitHub profile was not found.');
  if (!response.ok) throw new HttpError(502, 'GitHub returned an unsuccessful response.');

  try {
    return await response.json();
  } catch {
    throw new HttpError(502, 'GitHub returned an invalid response.');
  }
}

async function fetchProfileAndRepos(username) {
  const encoded = encodeURIComponent(username);
  const [profile, repositories] = await Promise.all([
    getJson(`https://api.github.com/users/${encoded}`),
    getJson(`https://api.github.com/users/${encoded}/repos?sort=updated&per_page=100&type=owner`)
  ]);
  if (!Array.isArray(repositories) || typeof profile.login !== 'string') {
    throw new HttpError(502, 'GitHub returned incomplete profile data.');
  }

  const cleanProfile = {
    login: profile.login,
    name: profile.name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    html_url: profile.html_url,
    public_repos: profile.public_repos,
    followers: profile.followers,
    following: profile.following,
    created_at: profile.created_at
  };
  const cleanRepositories = repositories
    .filter(repository => !repository.fork)
    .map(repository => ({
      id: repository.id,
      name: repository.name,
      description: repository.description,
      language: repository.language,
      stargazers_count: repository.stargazers_count,
      forks_count: repository.forks_count,
      html_url: repository.html_url,
      updated_at: repository.updated_at
    }));
  return { profile: cleanProfile, repositories: cleanRepositories };
}

export async function getGitHubData() {
  const username = process.env.GITHUB_USERNAME?.trim();
  if (!username) throw new HttpError(503, 'GitHub integration is not configured.');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(username)) {
    throw new HttpError(503, 'The configured GitHub username is invalid.');
  }

  const now = Date.now();
  if (cache?.username === username && cache.expiresAt > now) {
    return { data: cache.data, cache: 'hit', stale: false };
  }
  if (inFlight?.username === username) return inFlight.promise;

  const pending = (async () => {
    try {
      const data = await fetchProfileAndRepos(username);
      try {
        await GitHubSnapshot.findOneAndUpdate(
          { username: username.toLowerCase() },
          { $set: { profile: data.profile, repositories: data.repositories, fetchedAt: new Date() } },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
      } catch (error) {
        console.error('Unable to persist the latest GitHub snapshot:', error);
      }

      cache = {
        username,
        data,
        expiresAt: Date.now() + cacheDuration,
        staleUntil: Date.now() + staleDuration
      };
      return { data, cache: 'miss', stale: false };
    } catch (error) {
      if (cache?.username === username && cache.staleUntil > Date.now()) {
        return { data: cache.data, cache: 'stale', stale: true };
      }

      let snapshot;
      try {
        snapshot = await GitHubSnapshot.findOne({ username: username.toLowerCase() }).lean();
      } catch (storageError) {
        console.error('Unable to load the persisted GitHub snapshot:', storageError);
      }
      if (snapshot) {
        const data = { profile: snapshot.profile, repositories: snapshot.repositories };
        cache = {
          username,
          data,
          expiresAt: Date.now(),
          staleUntil: Date.now() + staleDuration
        };
        return { data, cache: 'stale', stale: true };
      }

      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'Unable to load GitHub data.');
    } finally {
      if (inFlight?.promise === pending) inFlight = undefined;
    }
  })();
  inFlight = { username, promise: pending };
  return pending;
}
