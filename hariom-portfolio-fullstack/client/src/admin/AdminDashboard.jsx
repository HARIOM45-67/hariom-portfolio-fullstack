import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get('/api/projects', { signal: controller.signal }),
      api.get('/api/resume', { signal: controller.signal }),
      api.get('/api/analytics/summary', { signal: controller.signal })
    ]).then(([projects, resume, analytics]) => {
      setSummary({
        projects: projects.data.projects.length,
        resume: Boolean(resume.data.resume),
        visitors: analytics.data.visitors,
        pageViews: analytics.data.pageViews,
        popularSections: analytics.data.popularSections,
        popularProjects: analytics.data.popularProjects,
        contactSubmissions: analytics.data.contactSubmissions
      });
    }).catch(requestError => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load dashboard data.'));
    });
    return () => controller.abort();
  }, []);

  return <section>
    <p className="eyebrow"><span>ADMIN</span> / DASHBOARD</p>
    <h1>Portfolio dashboard</h1>
    {error && <p className="form-status error" role="alert">{error}</p>}
    {!summary && !error && <p role="status">Loading dashboard…</p>}
    {summary && <div className="admin-stats">
      <article><span>Contact submissions</span><strong>{summary.contactSubmissions}</strong><Link to="/admin/queries">Manage queries →</Link></article>
      <article><span>Published projects</span><strong>{summary.projects}</strong><Link to="/admin/projects">Manage projects →</Link></article>
      <article><span>Resume</span><strong>{summary.resume ? 'Admin-uploaded' : 'Default CV included'}</strong><Link to="/admin/resume">Manage resume →</Link></article>
      <article><span>Unique visitors · last 30 days</span><strong>{summary.visitors}</strong></article>
      <article><span>Section views · last 30 days</span><strong>{summary.pageViews}</strong></article>
    </div>}
    {summary && <section className="admin-analytics"><h2 className="admin-subheading">Most viewed sections · last 30 days</h2>
      {summary.popularSections.length > 0
        ? <ol>{summary.popularSections.map(({ section, views }) => <li key={section}><span>{section.replaceAll('-', ' ')}</span><strong>{views} views</strong></li>)}</ol>
        : <p className="muted-text">No opted-in section views have been recorded yet.</p>}
      <p className="muted-text">Analytics are collected only after a visitor opts in. IP addresses are not stored.</p>
    </section>}
    {summary && <section className="admin-analytics"><h2 className="admin-subheading">Most viewed projects · last 30 days</h2>
      {summary.popularProjects.length > 0
        ? <ol>{summary.popularProjects.map(({ slug, name, views }) => <li key={slug}><span>{name}</span><strong>{views} views</strong></li>)}</ol>
        : <p className="muted-text">No opted-in project views have been recorded yet.</p>}
    </section>}
  </section>;
}
