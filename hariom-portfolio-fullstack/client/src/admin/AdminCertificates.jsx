import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api.js';

const blankCertificate = {
  title: '',
  issuer: '',
  issueDate: '',
  credentialUrl: '',
  displayOrder: '0'
};
const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function hasValidSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (file.type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return file.type === 'image/webp'
    && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
}

function certificateForm(certificate) {
  return {
    title: certificate.title,
    issuer: certificate.issuer,
    issueDate: certificate.issueDate,
    credentialUrl: certificate.credentialUrl || '',
    displayOrder: String(certificate.displayOrder || 0)
  };
}

export default function AdminCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [form, setForm] = useState(blankCertificate);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/certificates', { signal: controller.signal })
      .then(response => setCertificates(response.data.certificates || []))
      .catch(requestError => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load certificates.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  function reset() {
    setForm(blankCertificate);
    setFile(null);
    setEditingId('');
    setError('');
    setStatus('');
    const input = document.getElementById('certificate-file');
    if (input) input.value = '';
  }

  function edit(certificate) {
    setEditingId(certificate.id);
    setForm(certificateForm(certificate));
    setFile(null);
    setError('');
    setStatus('');
    const input = document.getElementById('certificate-file');
    if (input) input.value = '';
  }

  async function save(event) {
    event.preventDefault();
    if (!editingId && !file) {
      setError('Attach the certificate image or PDF before publishing.');
      return;
    }
    if (file && (!allowedTypes.has(file.type) || file.size > maxFileSize)) {
      setError('Choose a PDF, JPEG, PNG, or WebP file no larger than 5 MB.');
      return;
    }

    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (file && !(await hasValidSignature(file))) {
        setError('The selected file content does not match its type.');
        return;
      }
      const data = new FormData();
      Object.entries({ ...form, displayOrder: String(Number(form.displayOrder)) }).forEach(([key, value]) => data.append(key, value));
      if (file) data.append('certificate', file);
      if (editingId) await api.put(`/api/certificates/${editingId}`, data);
      else await api.post('/api/certificates', data);
      const savedStatus = editingId ? 'Certificate updated and published.' : 'Certificate published.';
      reset();
      setStatus(savedStatus);
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to publish the certificate.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(certificate) {
    if (!window.confirm(`Delete "${certificate.title}"?`)) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await api.delete(`/api/certificates/${certificate.id}`);
      if (editingId === certificate.id) reset();
      setStatus('Certificate deleted.');
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete the certificate.'));
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <p className="eyebrow"><span>ADMIN</span> / CERTIFICATES</p>
    <h1>Manage certificates</h1>
    <p className="muted-text">Only publish certificates you have earned and can verify. Upload a certificate image or PDF.</p>
    {error && <p className="form-status error" role="alert">{error}</p>}
    {status && <p className="form-status success" role="status">{status}</p>}
    {loading && <p role="status">Loading certificates…</p>}
    {!loading && certificates.length === 0 && <p className="muted-text">No certificates have been published.</p>}
    {!loading && certificates.length > 0 && <div className="admin-list">{certificates.map(certificate => <article className="admin-record" key={certificate.id}>
      <h2>{certificate.title}</h2>
      <p>{certificate.issuer} · {certificate.issueDate}</p>
      <div className="admin-actions">
        <a className="button secondary" href={certificate.mediaUrl} target="_blank" rel="noopener noreferrer">View asset</a>
        <button className="button secondary" type="button" disabled={busy} onClick={() => edit(certificate)}>Edit</button>
        <button className="button danger" type="button" disabled={busy} onClick={() => remove(certificate)}>Delete</button>
      </div>
    </article>)}</div>}
    <form className="contact-form admin-certificate-form" onSubmit={save} aria-busy={busy}>
      <h2>{editingId ? 'Edit certificate' : 'Publish certificate'}</h2>
      <label htmlFor="certificate-title">Certificate title<input id="certificate-title" required minLength="2" maxLength="160" value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))}/></label>
      <label htmlFor="certificate-issuer">Issuer<input id="certificate-issuer" required minLength="2" maxLength="160" value={form.issuer} onChange={event => setForm(value => ({ ...value, issuer: event.target.value }))}/></label>
      <label htmlFor="certificate-date">Issue date<input id="certificate-date" type="date" required value={form.issueDate} onChange={event => setForm(value => ({ ...value, issueDate: event.target.value }))}/></label>
      <label htmlFor="certificate-credential">Credential verification URL (optional)<input id="certificate-credential" type="url" placeholder="https://" value={form.credentialUrl} onChange={event => setForm(value => ({ ...value, credentialUrl: event.target.value }))}/></label>
      <label htmlFor="certificate-file">Certificate image or PDF (max 5 MB){editingId && ' · leave empty to keep the current file'}
        <input id="certificate-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" required={!editingId} onChange={event => setFile(event.target.files?.[0] || null)}/>
      </label>
      <label htmlFor="certificate-order">Display order<input id="certificate-order" type="number" min="0" max="10000" value={form.displayOrder} onChange={event => setForm(value => ({ ...value, displayOrder: event.target.value }))}/></label>
      <div className="admin-actions">
        <button className="button primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save certificate' : 'Publish certificate'}</button>
        {editingId && <button className="button secondary" type="button" disabled={busy} onClick={reset}>Cancel edit</button>}
      </div>
    </form>
  </section>;
}
