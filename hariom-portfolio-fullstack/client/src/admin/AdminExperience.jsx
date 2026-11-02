import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api.js';

const blankExperience = {
  organization: '',
  position: '',
  description: '',
  startDate: '',
  endDate: '',
  displayOrder: '0'
};

function formValues(experience) {
  return {
    organization: experience.organization || '',
    position: experience.position || '',
    description: experience.description || '',
    startDate: experience.startDate || '',
    endDate: experience.endDate || '',
    displayOrder: String(experience.displayOrder || 0)
  };
}

function payload(form) {
  return { ...form, displayOrder: Number(form.displayOrder) };
}

export default function AdminExperience() {
  const [experiences, setExperiences] = useState([]);
  const [form, setForm] = useState(blankExperience);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/experience', { signal: controller.signal })
      .then(response => {
        const records = response.data.experience || [];
        setExperiences(records);
        if (records.length > 0) {
          setEditingId(records[0].id || '');
          setForm(formValues(records[0]));
        }
      })
      .catch(requestError => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load experience details.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  function edit(experience) {
    setEditingId(experience.id || '');
    setForm(formValues(experience));
    setError('');
    setStatus('');
  }

  function newExperience() {
    setEditingId('');
    setForm(blankExperience);
    setError('');
    setStatus('');
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (editingId) await api.put(`/api/experience/${editingId}`, payload(form));
      else await api.post('/api/experience', payload(form));
      setStatus(editingId ? 'Experience details updated.' : 'Experience details published.');
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save experience details.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(experience) {
    if (!experience.id || !window.confirm(`Delete experience at "${experience.organization}"?`)) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await api.delete(`/api/experience/${experience.id}`);
      setStatus('Experience record deleted.');
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete the experience record.'));
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <p className="eyebrow"><span>ADMIN</span> / EXPERIENCE</p>
    <h1>Manage experience</h1>
    <p className="muted-text">Only enter a role, dates, responsibilities, or achievements that you can confirm.</p>
    {error && <p className="form-status error" role="alert">{error}</p>}
    {status && <p className="form-status success" role="status">{status}</p>}
    {loading && <p role="status">Loading experience records…</p>}
    {!loading && experiences.length > 1 && <div className="admin-list">{experiences.map(experience => <article className="admin-record" key={experience.id || experience.organization}>
      <h2>{experience.organization}</h2>
      {experience.position && <p>{experience.position}</p>}
      <div className="admin-actions">
        <button className="button secondary" type="button" onClick={() => edit(experience)}>Edit</button>
        {experience.id && <button className="button danger" type="button" disabled={busy} onClick={() => remove(experience)}>Delete</button>}
      </div>
    </article>)}</div>}
    <form className="contact-form admin-experience-form" onSubmit={save} aria-busy={busy}>
      <label htmlFor="experience-organization">Organization<input id="experience-organization" required minLength="2" maxLength="120" value={form.organization} onChange={event => setForm(value => ({ ...value, organization: event.target.value }))}/></label>
      <label htmlFor="experience-position">Job title or position (optional)<input id="experience-position" maxLength="120" value={form.position} onChange={event => setForm(value => ({ ...value, position: event.target.value }))}/></label>
      <label htmlFor="experience-description">Responsibilities and achievements (optional)<textarea id="experience-description" maxLength="3000" rows="6" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))}/></label>
      <div className="form-row">
        <label htmlFor="experience-start">Start date or period (optional)<input id="experience-start" maxLength="40" value={form.startDate} onChange={event => setForm(value => ({ ...value, startDate: event.target.value }))}/></label>
        <label htmlFor="experience-end">End date or period (optional)<input id="experience-end" maxLength="40" value={form.endDate} onChange={event => setForm(value => ({ ...value, endDate: event.target.value }))}/></label>
      </div>
      <label htmlFor="experience-order">Display order<input id="experience-order" type="number" min="0" max="10000" value={form.displayOrder} onChange={event => setForm(value => ({ ...value, displayOrder: event.target.value }))}/></label>
      <div className="admin-actions">
        <button className="button primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Publish experience'}</button>
        {editingId && <button className="button secondary" type="button" disabled={busy} onClick={newExperience}>Add experience</button>}
        {editingId && experiences.length === 1 && experiences[0].id && <button className="button danger" type="button" disabled={busy} onClick={() => remove(experiences[0])}>Delete experience</button>}
      </div>
    </form>
  </section>;
}
