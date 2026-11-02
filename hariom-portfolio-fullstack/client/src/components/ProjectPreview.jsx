import { ImageOff } from 'lucide-react';

export default function ProjectPreview({ project }) {
  return <div className="project-placeholder" role="img" aria-label={`${project.name}: no screenshot available`}>
    <ImageOff size={25} aria-hidden="true"/>
    <span>No screenshot available</span>
  </div>;
}
