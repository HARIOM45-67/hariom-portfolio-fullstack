import { ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ResumeSection({ resume, loading, error }) {
  return <div className="resume-card">
    {loading && <p className="muted-text" role="status">Checking for the latest resume…</p>}
    {!loading && error && <p className="notice" role="alert">{error}</p>}
    {!loading && !error && !resume && <p className="muted-text">No resume has been published yet.</p>}
    {!loading && resume && <>
      <p className="muted-text">{resume.isLocal ? 'Current CV · PDF · Ready to download' : `Latest resume · Updated ${new Date(resume.uploadedAt).toLocaleDateString()}`}</p>
      <a className="button secondary" href={resume.isLocal ? resume.downloadUrl : api.getUri({ url: resume.downloadUrl })} download>Download resume <ArrowUpRight size={16}/></a>
    </>}
  </div>;
}
