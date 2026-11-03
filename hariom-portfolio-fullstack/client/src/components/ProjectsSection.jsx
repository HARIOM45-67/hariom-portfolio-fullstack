import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, ExternalLink, Github } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api.js';
import { projectScreenshotOverrides, supplementalProjects } from '../data/projects.js';
import ProjectPreview from './ProjectPreview.jsx';

function projectNameKey(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toLowerCase() : '';
}

function projectUrlKey(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`.toLowerCase();
  } catch {
    return value.trim().replace(/\/+$/, '').toLowerCase();
  }
}

function appendSupplementalProjects(projects) {
  const projectNames = new Set(projects.map(project => projectNameKey(project.name)).filter(Boolean));
  const projectUrls = new Set(projects.map(project => projectUrlKey(project.liveUrl)).filter(Boolean));
  const additions = supplementalProjects.filter(project => {
    const name = projectNameKey(project.name);
    const url = projectUrlKey(project.liveUrl);
    if ((name && projectNames.has(name)) || (url && projectUrls.has(url))) return false;
    if (name) projectNames.add(name);
    if (url) projectUrls.add(url);
    return true;
  });
  return [...projects, ...additions];
}

function applyScreenshotOverrides(projects) {
  const overridesByUrl = new Map(
    projectScreenshotOverrides.map(override => [projectUrlKey(override.liveUrl), override.imageUrl])
  );
  return projects.map(project => ({
    ...project,
    imageUrl: overridesByUrl.get(projectUrlKey(project.liveUrl)) || project.imageUrl
  }));
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

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function ProjectCardArt({ project, index }) {
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const hasScreenshot = Boolean(project.imageUrl) && !screenshotFailed;

  return <div className={`project-art art-${(index % 3) + 1}${hasScreenshot ? ' has-screenshot' : ' has-preview'}`}>
    {hasScreenshot
      ? <img
          className="project-screenshot"
          src={project.imageUrl}
          alt={`${project.name} project screenshot`}
          loading="lazy"
          onError={() => setScreenshotFailed(true)}
        />
      : <ProjectPreview project={project}/>}
    {hasScreenshot && <span>PROJECT / {String(index + 1).padStart(2, '0')}</span>}
  </div>;
}

export default function ProjectsSection() {
  const [projects, setProjects] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [repositoryError, setRepositoryError] = useState('');
  const [repositoryStale, setRepositoryStale] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setProjectsError('');
      setRepositoryError('');
      setRepositoryStale(false);

      const [projectsResult, repositoriesResult] = await Promise.allSettled([
        api.get('/api/projects', { signal: controller.signal }),
        api.get('/api/github/repos', { signal: controller.signal })
      ]);
      if (controller.signal.aborted) return;

      if (projectsResult.status === 'fulfilled') {
        setProjects(projectsResult.value.data.projects || []);
      } else {
        setProjectsError(getApiErrorMessage(projectsResult.reason, 'Unable to load published projects.'));
      }

      if (repositoriesResult.status === 'fulfilled') {
        setRepositories(repositoriesResult.value.data.repositories || []);
        setRepositoryStale(repositoriesResult.value.headers['x-github-cache'] === 'stale');
      } else {
        setRepositoryError(getApiErrorMessage(repositoriesResult.reason, 'Unable to load GitHub repositories.'));
      }
      setLoading(false);
    }

    load();
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
      description: repository.description || '',
      problemSolved: '',
      features: [],
      imageUrl: '',
      stack: repository.language ? [repository.language] : [],
      liveUrl: secureHomepage(repository.homepage),
      repoUrl: repository.html_url,
      featured: false,
      githubRepository: true,
      stars: Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : null,
      forks: Number.isFinite(repository.forks_count) ? repository.forks_count : null,
      updatedAt: repository.updated_at || null
    }));
  const displayedProjects = appendSupplementalProjects(
    applyScreenshotOverrides([...projects, ...repositoryProjects])
  );

  return <>
    {loading && <p className="muted-text project-loading" role="status">Loading published projects and verified GitHub repositories…</p>}
    {!loading && projectsError && <p className="notice" role="alert">{projectsError} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {!loading && repositoryError && <p className="notice" role="alert">{repositoryError} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {!loading && repositoryStale && <p className="muted-text" role="status">Showing the most recently saved public GitHub data while GitHub is temporarily unavailable.</p>}
    {!loading && !projectsError && !repositoryError && displayedProjects.length === 0 && <p className="muted-text project-empty">No projects have been published and no public repositories are available.</p>}
    {!loading && displayedProjects.length > 0 && <div className="project-grid">
      {displayedProjects.map((project, index) => {
        const primaryUrl = project.liveUrl || project.repoUrl;
        const detailsId = `project-details-${project.slug}`;
        const isExpanded = expandedProjectId === project.id;
        const features = project.features || [];
        const techStack = project.stack || [];
        return <article className="project-card" key={project.id} data-analytics-project={project.slug}>
          <ProjectCardArt project={project} index={index}/>
          <div className="project-content">
            <div className="project-title">
              <div><small>{project.githubRepository ? 'PUBLIC REPOSITORY' : project.featured ? 'FEATURED PROJECT' : 'PROJECT'}</small><h3>{project.name}</h3></div>
              {primaryUrl && <a href={primaryUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.name}`}><ArrowUpRight/></a>}
            </div>
            {(project.description || project.githubRepository) && <p>{project.description || 'No description is published for this repository.'}</p>}
            {project.problemSolved && <p className="project-problem"><strong>Project focus:</strong> {project.problemSolved}</p>}
            {techStack.length > 0 && <div className="tags">{techStack.map(tag => <span key={tag}>{tag}</span>)}</div>}
            {project.githubRepository && <div className="project-repo-stats">
              {project.stars !== null && <span>{project.stars} stars</span>}
              {project.forks !== null && <span>{project.forks} forks</span>}
              {formatDate(project.updatedAt) && <time dateTime={project.updatedAt}>Updated {formatDate(project.updatedAt)}</time>}
            </div>}
            <button
              className="project-details-toggle"
              type="button"
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              onClick={() => setExpandedProjectId(isExpanded ? '' : project.id)}
            >
              {isExpanded ? 'Hide details' : 'Project details'} <ArrowDown size={14} aria-hidden="true"/>
            </button>
            {isExpanded && <div className="project-details" id={detailsId}>
              <h4>Project details</h4>
              {project.githubRepository
                ? <p>{project.description || 'The repository owner has not published a description.'}</p>
                : project.problemSolved && <p><strong>Project focus:</strong> {project.problemSolved}</p>}
              <h5>Features</h5>
              {features.length > 0
                ? <ul>{features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                : <p>{project.githubRepository
                  ? 'No verified feature list is available in GitHub repository metadata.'
                  : 'No feature list has been published for this project.'}</p>}
              <h5>Technology stack</h5>
              {techStack.length > 0
                ? <div className="tags">{techStack.map(tag => <span key={tag}>{tag}</span>)}</div>
                : <p>No technology stack has been published.</p>}
            </div>}
            {(project.liveUrl || project.repoUrl) && <div className="project-links">
              {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live Demo <ExternalLink size={13}/></a>}
              {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">Source code <Github size={13}/></a>}
            </div>}
          </div>
        </article>;
      })}
    </div>}
  </>;
}
