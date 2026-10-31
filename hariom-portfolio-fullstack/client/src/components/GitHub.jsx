import { useEffect, useState } from 'react';
import { Github, ExternalLink, GitFork, Star } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function GitHubSection() {
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [error, setError] = useState('');
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
      setError('');
      try {
        const [profileResponse, reposResponse] = await Promise.all([
          api.get('/api/github/profile', { signal: controller.signal }),
          api.get('/api/github/repos', { signal: controller.signal })
        ]);
        setProfile(profileResponse.data.profile);
        setRepos(reposResponse.data.repositories);
        setStale(profileResponse.headers['x-github-cache'] === 'stale' || reposResponse.headers['x-github-cache'] === 'stale');
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError, 'Unable to load GitHub data.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [reload]);

  return <div className="github-panel">
    <div className="github-top"><div><Github size={22}/><strong>GitHub activity</strong></div>
      {profile && <a href={profile.html_url} target="_blank" rel="noopener noreferrer">View profile <ExternalLink size={14}/></a>}
    </div>
    {loading && <p className="muted-text" role="status">Loading public profile and repositories…</p>}
    {error && <p className="notice" role="alert">{error} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {stale && <p className="muted-text" role="status">Showing the latest cached GitHub data while GitHub is temporarily unavailable.</p>}
    {profile && <div className="github-profile">
      <img src={profile.avatar_url} alt={`${profile.login} GitHub avatar`} loading="lazy" />
      <div><h3>{profile.name || profile.login}</h3>
        {profile.bio && <p>{profile.bio}</p>}
        <small>{profile.public_repos} public repositories · {profile.followers} followers</small>
      </div>
    </div>}
    {!loading && !error && profile && repos.length === 0 && <p className="muted-text">No public repositories are available.</p>}
    {languages.length > 0 && <div className="github-languages"><h3>Primary languages across public repositories</h3><div>{languages.map(({ language, repositories }) => <span key={language}>{language}<strong>{repositories} {repositories === 1 ? 'repository' : 'repositories'}</strong></span>)}</div></div>}
    {repos.length > 0 && <div className="repo-grid">{repos.slice(0, 6).map(repo => <a className="repo-card" key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer">
      <strong>{repo.name}</strong>
      {repo.description && <p>{repo.description}</p>}
      <div>
        {repo.language && <span>{repo.language}</span>}
        <span><Star size={13}/> {repo.stargazers_count}</span>
        <span><GitFork size={13}/> {repo.forks_count}</span>
      </div>
      <time dateTime={repo.updated_at}>Updated {new Date(repo.updated_at).toLocaleDateString()}</time>
    </a>)}</div>}
    {profile && <a className="github-contributions-link" href={`${profile.html_url}?tab=overview`} target="_blank" rel="noopener noreferrer">View contribution graph and recent activity on GitHub <ExternalLink size={14}/></a>}
  </div>;
}
