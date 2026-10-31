import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api.js';

const blankProject = {
  name: '',
  description: '',
  problemSolved: '',
  imageUrl: '',
  stack: '',
  liveUrl: '',
  repoUrl: '',
  featured: false,
  displayOrder: '0'
};

function projectPayload(form) {
  return {
    ...form,
    stack: form.stack.split(',').map(value => value.trim()).filter(Boolean),
    displayOrder: Number(form.displayOrder)
  };
}

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(blankProject);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/projects', { signal: controller.signal })
      .then(response => setProjects(response.data.projects))
      .catch(requestError => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load projects.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  function editProject(project) {
    setEditingId(project.id);
    setError('');
    setStatus('');
    setForm({
      name: project.name,
      description: project.description,
      problemSolved: project.problemSolved || '',
      imageUrl: project.imageUrl || '',
      stack: project.stack.join(', '),
      liveUrl: project.liveUrl,
      repoUrl: project.repoUrl,
      featured: project.featured,
      displayOrder: String(project.displayOrder)
    });
  }

  function resetForm() {
    setForm(blankProject);
    setEditingId('');
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (editingId) await api.put(`/api/projects/${editingId}`, projectPayload(form));
      else await api.post('/api/projects', projectPayload(form));
      setStatus(editingId ? 'Project updated.' : 'Project published.');
      resetForm();
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save project.'));
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete "${project.name}" from the portfolio?`)) return;
    setError('');
    setStatus('');
    try {
      await api.delete(`/api/projects/${project.id}`);
      setStatus('Project deleted.');
      if (editingId === project.id) resetForm();
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete project.'));
    }
  }

  return <section>
    <p className="eyebrow"><span>ADMIN</span> / PROJECTS</p>
    <h1>Manage projects</h1>
    {error && <p className="form-status error" role="alert">{error}</p>}
    {status && <p className="form-status success" role="status">{status}</p>}
    <form className="contact-form admin-project-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="project-name">Project name<input id="project-name" required minLength="2" maxLength="100" value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))}/></label>
      <label htmlFor="project-description">Description<textarea id="project-description" required minLength="10" maxLength="2000" rows="4" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))}/></label>
      <label htmlFor="project-problem">Problem solved<textarea id="project-problem" maxLength="1000" rows="3" value={form.problemSolved} onChange={event => setForm(value => ({ ...value, problemSolved: event.target.value }))}/></label>
      <label htmlFor="project-image">Project screenshot URL<input id="project-image" type="url" placeholder="https://" value={form.imageUrl} onChange={event => setForm(value => ({ ...value, imageUrl: event.target.value }))}/></label>
      <label htmlFor="project-stack">Technologies (comma separated)<input id="project-stack" value={form.stack} onChange={event => setForm(value => ({ ...value, stack: event.target.value }))}/></label>
      <div className="form-row">
        <label htmlFor="project-live-url">Live demo URL<input id="project-live-url" type="url" placeholder="https://" value={form.liveUrl} onChange={event => setForm(value => ({ ...value, liveUrl: event.target.value }))}/></label>
        <label htmlFor="project-repo-url">Source repository URL<input id="project-repo-url" type="url" placeholder="https://" value={form.repoUrl} onChange={event => setForm(value => ({ ...value, repoUrl: event.target.value }))}/></label>
      </div>
      <label htmlFor="project-order">Display order<input id="project-order" type="number" min="0" max="10000" value={form.displayOrder} onChange={event => setForm(value => ({ ...value, displayOrder: event.target.value }))}/></label>
      <label className="admin-checkbox" htmlFor="project-featured"><input id="project-featured" type="checkbox" checked={form.featured} onChange={event => setForm(value => ({ ...value, featured: event.target.checked }))}/> Feature this project</label>
      <div className="admin-actions"><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Publish project'}</button>
        {editingId && <button className="button secondary" type="button" onClick={resetForm}>Cancel edit</button>}
      </div>
    </form>
    <h2 className="admin-subheading">Published projects</h2>
    {loading && <p role="status">Loading projects…</p>}
    {!loading && projects.length === 0 && <p className="muted-text">No projects have been published.</p>}
    {!loading && projects.length > 0 && <div className="admin-list">
      {projects.map(project => <article className="admin-record" key={project.id}>
        <div className="admin-record-heading"><h3>{project.name}</h3>{project.featured && <span className="status-pill read">Featured</span>}</div>
        <p>{project.description}</p>
        <div className="admin-actions">
          <button className="button secondary" onClick={() => editProject(project)}>Edit</button>
          <button className="button danger" onClick={() => deleteProject(project)}>Delete</button>
        </div>
      </article>)}
    </div>}
  </section>;
}
