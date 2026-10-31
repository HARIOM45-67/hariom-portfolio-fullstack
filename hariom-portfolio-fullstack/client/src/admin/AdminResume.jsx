import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function AdminResume() {
  const [resume, setResume] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/resume', { signal: controller.signal })
      .then(response => setResume(response.data.resume))
      .catch(requestError => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load resume information.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  async function upload(event) {
    event.preventDefault();
    if (!file) {
      setError('Choose a PDF before uploading.');
      return;
    }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf') || file.size > 5 * 1024 * 1024) {
      setError('Choose a PDF file no larger than 5 MB.');
      return;
    }

    setBusy(true);
    setError('');
    setStatus('');
    try {
      const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (signature !== '%PDF-') {
        setError('The selected file does not have a valid PDF signature.');
        return;
      }
      const data = new FormData();
      data.append('resume', file);
      await api.post('/api/resume', data);
      setFile(null);
      event.target.reset();
      setStatus('Resume uploaded and published.');
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to upload the resume.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeResume() {
    if (!window.confirm('Delete the published resume? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await api.delete('/api/resume');
      setStatus('Published resume deleted.');
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete the resume.'));
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <p className="eyebrow"><span>ADMIN</span> / RESUME</p>
    <h1>Manage resume</h1>
    {error && <p className="form-status error" role="alert">{error}</p>}
    {status && <p className="form-status success" role="status">{status}</p>}
    {loading && <p role="status">Loading resume information…</p>}
    {!loading && resume && <article className="admin-record">
      <h2>{resume.originalName}</h2>
      <p>{(resume.bytes / (1024 * 1024)).toFixed(2)} MB · Uploaded {new Date(resume.uploadedAt).toLocaleString()}</p>
      <a className="button secondary" href={api.getUri({ url: resume.downloadUrl })} target="_blank" rel="noopener noreferrer">Preview / download</a>
      <button className="button danger" disabled={busy} onClick={removeResume}>Delete resume</button>
    </article>}
    {!loading && !resume && !error && <p className="muted-text">No resume has been published.</p>}
    <form className="contact-form admin-upload" onSubmit={upload} aria-busy={busy}>
      <label htmlFor="resume-file">Upload or replace resume (PDF, max 5 MB)</label>
      <input id="resume-file" type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0] || null)}/>
      <button className="button primary" disabled={busy}>{busy ? 'Uploading…' : resume ? 'Replace resume' : 'Upload resume'}</button>
    </form>
  </section>;
}
