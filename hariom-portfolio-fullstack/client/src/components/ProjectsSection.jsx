import { useEffect, useState } from 'react';
import { ArrowUpRight, ExternalLink, Github } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api.js';
import { githubRepositoryFallback } from '../data/github-repository-fallback.js';
import ProjectPreview from './ProjectPreview.jsx';

export default function ProjectsSection() {
  const [projects, setProjects] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repositoryError, setRepositoryError] = useState('');
  const [usingRepositoryFallback, setUsingRepositoryFallback] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects() {
      setLoading(true);
      setError('');
      setRepositoryError('');
      setUsingRepositoryFallback(false);
      try {
        const response = await api.get('/api/projects', { signal: controller.signal });
        setProjects(response.data.projects);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(requestError, 'Unable to load projects.'));
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get('/api/github/repos', { signal: controller.signal });
        setRepositories(response.data.repositories);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setRepositoryError(getApiErrorMessage(requestError, 'Unable to load GitHub repositories.'));
          setRepositories(githubRepositoryFallback);
          setUsingRepositoryFallback(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProjects();
    return () => controller.abort();
  }, [reload]);

  const publishedRepositoryUrls = new Set(
    projects
      .map(project => project.repoUrl?.replace(/\/+$/, '').toLowerCase())
      .filter(Boolean)
  );
  const repositoryProjects = repositories
    .filter(repository => !publishedRepositoryUrls.has(repository.html_url.replace(/\/+$/, '').toLowerCase()))
    .map(repository => ({
      id: `github-${repository.id}`,
      name: repository.name,
      slug: `github-${repository.id}`,
      description: repository.description
        || 'Public GitHub repository. Explore the source code and implementation details.',
      problemSolved: '',
      imageUrl: '',
      stack: repository.language ? [repository.language] : [],
      liveUrl: '',
      repoUrl: repository.html_url,
      featured: false,
      githubRepository: true,
      stars: Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : null,
      forks: Number.isFinite(repository.forks_count) ? repository.forks_count : null,
      updatedAt: repository.updated_at || null
    }));
  const displayedProjects = [...projects, ...repositoryProjects];

  return <>
    {loading && <p className="muted-text" role="status">Loading published projects…</p>}
    {error && <div className="notice" role="alert">{error} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></div>}
    {!loading && repositoryError && projects.length > 0 && <p className="notice" role="status">{usingRepositoryFallback ? 'Live GitHub data is temporarily unavailable; showing the saved public repository list.' : repositoryError} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {!loading && repositoryError && projects.length === 0 && usingRepositoryFallback && <p className="notice" role="status">Live GitHub data is temporarily unavailable; showing the saved public repository list. <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {!loading && repositoryError && projects.length === 0 && !usingRepositoryFallback && <div className="notice project-empty" role="alert">{repositoryError} Projects will appear when GitHub is reachable. <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></div>}
    {!loading && !error && !repositoryError && displayedProjects.length === 0 && <p className="muted-text project-empty">No projects have been published and no public repositories are available.</p>}
    {!loading && !error && displayedProjects.length > 0 && <div className="project-grid">
      {displayedProjects.map((project, index) => {
        const primaryUrl = project.liveUrl || project.repoUrl;
        return <article className="project-card" key={project.id} data-analytics-project={project.slug}>
          <div className={`project-art art-${(index % 3) + 1}${project.imageUrl ? ' has-screenshot' : ' has-preview'}`}>
            {project.imageUrl
              ? <img className="project-screenshot" src={project.imageUrl} alt={`${project.name} project screenshot`} loading="lazy" />
              : <ProjectPreview project={project}/>}
            <span>{project.imageUrl ? `PROJECT / ${String(index + 1).padStart(2, '0')}` : 'ILLUSTRATIVE PREVIEW · NOT A SCREENSHOT'}</span>
          </div>
          <div className="project-content">
            <div className="project-title"><div><small>PROJECT</small><h3>{project.name}</h3></div>
              {primaryUrl && <a href={primaryUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.name}`}><ArrowUpRight/></a>}
            </div>
            <p>{project.description}</p>
            {project.problemSolved && <p className="project-problem"><strong>Problem solved:</strong> {project.problemSolved}</p>}
            {project.stack.length > 0 && <div className="tags">{project.stack.map(tag => <span key={tag}>{tag}</span>)}</div>}
            {project.githubRepository && <div className="project-repo-stats">
              {project.stars !== null && <span>{project.stars} stars</span>}
              {project.forks !== null && <span>{project.forks} forks</span>}
              {project.updatedAt && <time dateTime={project.updatedAt}>Updated {new Date(project.updatedAt).toLocaleDateString()}</time>}
            </div>}
            {(project.liveUrl || project.repoUrl) && <div className="project-links">
              {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live demo <ExternalLink size={13}/></a>}
              {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">Source code <Github size={13}/></a>}
            </div>}
          </div>
        </article>;
      })}
    </div>}
  </>;
}
