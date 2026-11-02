import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api.js';

function publicExperience(experience) {
  const dateRange = experience.startDate && experience.endDate
    ? `${experience.startDate} – ${experience.endDate}`
    : experience.startDate || experience.endDate;
  return <article className="experience-card" key={experience.id || experience.organization}>
    <div className="experience-heading">
      <div><h3>{experience.organization}</h3>{experience.position && <p>{experience.position}</p>}</div>
      {dateRange && <span>{dateRange}</span>}
    </div>
    {experience.description
      ? <p className="experience-description">{experience.description}</p>
      : <p className="muted-text">Role, responsibilities and dates have not been published.</p>}
  </article>;
}

export default function ExperienceSection({ fallback = [] }) {
  const [experiences, setExperiences] = useState([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/experience', { signal: controller.signal })
      .then(response => setExperiences(response.data.experience || []))
      .catch(requestError => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load experience details.'));
      });
    return () => controller.abort();
  }, [reload]);

  const visibleExperiences = error ? fallback : experiences;
  return <div className="experience-list">
    {error && <p className="notice" role="alert">{error} Showing only the organization information available in the portfolio. <button className="text-button" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
    {visibleExperiences.length > 0
      ? visibleExperiences.map(publicExperience)
      : <p className="muted-text">Experience details will be shared here when available.</p>}
  </div>;
}
