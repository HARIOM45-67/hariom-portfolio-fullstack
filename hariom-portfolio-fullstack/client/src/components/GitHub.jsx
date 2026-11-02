import { useEffect, useState } from 'react';
import { ExternalLink, GitFork, Github, Star } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api.js';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function secureHomepage(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export default function GitHubSection() {
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [profileError, setProfileError] = useState('');
  const [repositoriesError, setRepositoriesError] = useState('');
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [reload, setReload] = useState(0);
  const languages = [...repos.reduce((counts, repo) => {
    if (repo.language) counts.set(repo.language, (counts.get(repo.language) || 0) + 1);
    return counts;
  }, new Map())]
    .map(([language, repositories]) => ({ language, repositories }))
    .sort((first, second) => second.repositories - first.repositories)
    .slice(0, 5);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setProfileError('');
      setRepositoriesError('');

      const [profileResult, repositoriesResult] = await Promise.allSettled([
        api.get('/api/github/profile', { signal: controller.signal }),
        api.get('/api/github/repos', { signal: controller.signal })
      ]);
      if (controller.signal.aborted) return;

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.data.profile);
      } else {
        setProfileError(getApiErrorMessage(profileResult.reason, 'Unable to load the GitHub profile.'));
      }

      if (repositoriesResult.status === 'fulfilled') {
        setRepos(repositoriesResult.value.data.repositories || []);
      } else {
        setRepositoriesError(getApiErrorMessage(repositoriesResult.reason, 'Unable to load GitHub repositories.'));
      }
      setStale(
        (profileResult.status === 'fulfilled' && profileResult.value.headers['x-github-cache'] === 'stale')
        || (repositoriesResult.status === 'fulfilled' && repositoriesResult.value.headers['x-github-cache'] === 'stale')
      );
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [reload]);

  return <div className="github-panel">
    <div className="github-top"><div><Github size={22}/><strong>GitHub activity</strong></div>
      {profile && <a href={profile.html_url} target="_blank" rel="noopener noreferrer">View profile <ExternalLink size={14}/></a>}
    </div>
    {loading && <p className="muted-text" role="status">Loading public profile and repositories…</p>}
    {!loading && profileError && <p className="notice" role="alert">{profileError} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {!loading && repositoriesError && <p className="notice" role="alert">{repositoriesError} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {!loading && stale && <p className="muted-text" role="status">Showing the latest cached GitHub data while GitHub is temporarily unavailable.</p>}
    {profile && <div className="github-profile">
      {profile.avatar_url && <img src={profile.avatar_url} alt={`${profile.login} GitHub avatar`} loading="lazy" />}
      <div><h3>{profile.name || profile.login}</h3>
        {profile.bio && <p>{profile.bio}</p>}
        <small>{profile.public_repos} public repositories · {profile.followers} followers</small>
      </div>
    </div>}
    {!loading && !repositoriesError && repos.length === 0 && <p className="muted-text">No public repositories are available.</p>}
    {languages.length > 0 && <div className="github-languages"><h3>Primary languages across public repositories</h3><div>{languages.map(({ language, repositories }) => <span key={language}>{language}<strong>{repositories} {repositories === 1 ? 'repository' : 'repositories'}</strong></span>)}</div></div>}
    {repos.length > 0 && <div className="repo-grid">{repos.map(repo => <article className="repo-card" key={repo.id}>
      <a className="repo-card-title" href={repo.html_url} target="_blank" rel="noopener noreferrer">{repo.name}<ExternalLink size={13}/></a>
      <p>{repo.description || 'No description is published for this repository.'}</p>
      <div className="repo-card-meta">
        {repo.language && <span>{repo.language}</span>}
        <span><Star size={13}/> {repo.stargazers_count}</span>
        <span><GitFork size={13}/> {repo.forks_count}</span>
      </div>
      {formatDate(repo.updated_at) && <time dateTime={repo.updated_at}>Updated {formatDate(repo.updated_at)}</time>}
      {secureHomepage(repo.homepage) && <a className="repo-homepage" href={secureHomepage(repo.homepage)} target="_blank" rel="noopener noreferrer">Live site <ExternalLink size={12}/></a>}
    </article>)}</div>}
    {profile && <a className="github-contributions-link" href={`${profile.html_url}?tab=overview`} target="_blank" rel="noopener noreferrer">View contribution graph and recent activity on GitHub <ExternalLink size={14}/></a>}
  </div>;
}
