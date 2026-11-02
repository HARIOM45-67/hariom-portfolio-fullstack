import { ArrowUpRight, Download, Eye } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ResumeSection({ resume, loading, error, onRetry }) {
  return <div className="resume-card">
    {loading && <p className="muted-text" role="status">Checking for a published resume…</p>}
    {!loading && error && <div className="notice" role="alert">{error} <button className="text-button" onClick={onRetry}>Retry</button></div>}
    {!loading && !error && !resume && <p className="muted-text">No resume has been published yet. Please check back later.</p>}
    {!loading && resume && <>
      <p className="muted-text">PDF · Updated {new Date(resume.uploadedAt).toLocaleDateString()}</p>
      <div className="resume-actions">
        <a className="button secondary" href={api.getUri({ url: resume.downloadUrl })} target="_blank" rel="noopener noreferrer">View resume <Eye size={15}/><ArrowUpRight size={13}/></a>
        <a className="button primary" href={api.getUri({ url: `${resume.downloadUrl}?attachment=1` })}>Download PDF <Download size={15}/></a>
      </div>
    </>}
  </div>;
}
