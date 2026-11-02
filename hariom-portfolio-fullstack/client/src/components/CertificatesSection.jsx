import { useEffect, useState } from 'react';
import { ArrowUpRight, Award, FileText } from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api.js';

function issueDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function CertificatesSection() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
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

  if (loading) return <p className="muted-text" role="status">Loading published certificates…</p>;
  if (error) return <p className="notice" role="alert">{error} <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>;
  if (certificates.length === 0) return <div className="empty-feature-card"><Award size={25}/><h3>No certificates published</h3><p>Certificates will appear here after they have been uploaded and published.</p></div>;

  return <div className="certificate-grid">{certificates.map(certificate => {
    const isImage = certificate.mediaType?.startsWith('image/');
    return <article className="certificate-card" key={certificate.id}>
      <div className="certificate-media">
        {isImage
          ? <img src={certificate.mediaUrl} alt={`${certificate.title} certificate`} loading="lazy"/>
          : <div className="certificate-pdf" aria-label={`${certificate.title} PDF certificate`}><FileText size={34}/><span>PDF CERTIFICATE</span></div>}
      </div>
      <div className="certificate-card-body">
        <div className="certificate-card-top"><span className="certificate-icon"><Award size={19}/></span><span className="certificate-label">CERTIFICATE</span></div>
        <h3>{certificate.title}</h3>
        <p className="certificate-issuer">{certificate.issuer}</p>
        <div className="certificate-footer">
          <time dateTime={certificate.issueDate}>{issueDate(certificate.issueDate)}</time>
          <div className="certificate-actions">
            <a className="button secondary" href={certificate.mediaUrl} target="_blank" rel="noopener noreferrer">View file <ArrowUpRight size={14}/></a>
            {certificate.credentialUrl && <a className="certificate-credential" href={certificate.credentialUrl} target="_blank" rel="noopener noreferrer">Verify credential <ArrowUpRight size={13}/></a>}
          </div>
        </div>
      </div>
    </article>;
  })}</div>;
}
