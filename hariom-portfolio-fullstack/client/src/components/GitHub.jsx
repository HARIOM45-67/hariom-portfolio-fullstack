import { useEffect, useState } from 'react';
import { Github, ExternalLink, GitFork, Star } from 'lucide-react';

const username = import.meta.env.VITE_GITHUB_USERNAME;

export default function GitHubSection() {
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username || username === 'YOUR_GITHUB_USERNAME') {
      setError('Add your GitHub username in client/.env to load your live profile.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [profileRes, reposRes] = await Promise.all([
          fetch(`https://api.github.com/users/${encodeURIComponent(username)}`),
          fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6&type=owner`)
        ]);
        if (!profileRes.ok || !reposRes.ok) throw new Error('GitHub could not return this profile. Check the username or try again later.');
        const [profileData, repoData] = await Promise.all([profileRes.json(), reposRes.json()]);
        setProfile(profileData);
        setRepos(repoData.filter(repo => !repo.fork).slice(0, 6));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return <div className="github-panel">
    <div className="github-top"><div><Github size={22}/><strong>GitHub activity</strong></div>
      {profile && <a href={profile.html_url} target="_blank" rel="noreferrer">View profile <ExternalLink size={14}/></a>}
    </div>
    {loading && <p className="muted-text">Loading public repositories…</p>}
    {error && <p className="notice">{error}</p>}
    {profile && <div className="github-profile">
      <img src={profile.avatar_url} alt={`${profile.login} GitHub avatar`} />
      <div><h3>{profile.name || profile.login}</h3><p>{profile.bio || 'Building and learning in public.'}</p><small>{profile.public_repos} public repositories · {profile.followers} followers</small></div>
    </div>}
    {repos.length > 0 && <div className="repo-grid">{repos.map(repo => <a className="repo-card" key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer">
      <strong>{repo.name}</strong><p>{repo.description || 'No description provided yet.'}</p>
      <div><span>{repo.language || 'Code'}</span><span><Star size={13}/> {repo.stargazers_count}</span><span><GitFork size={13}/> {repo.forks_count}</span></div>
    </a>)}</div>}
  </div>;
}