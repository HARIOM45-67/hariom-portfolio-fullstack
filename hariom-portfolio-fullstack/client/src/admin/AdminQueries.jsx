import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function AdminQueries() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ q: '', from: '', to: '' });
  const [applied, setApplied] = useState(filters);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = { page: pagination.page, limit: pagination.limit };
    if (applied.q) params.q = applied.q;
    if (applied.from) params.from = applied.from;
    if (applied.to) params.to = applied.to;

    setLoading(true);
    setError('');
    api.get('/api/queries', { params, signal: controller.signal })
      .then(response => {
        setItems(response.data.items);
        setPagination(response.data.pagination);
      })
      .catch(requestError => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError, 'Unable to load contact queries.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied, pagination.page, pagination.limit, reload]);

  async function updateReadStatus(query) {
    setError('');
    try {
      await api.patch(`/api/queries/${query.queryId}`, { isRead: !query.isRead });
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to update query status.'));
    }
  }

  async function removeQuery(query) {
    if (!window.confirm(`Delete the query from ${query.name}? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/api/queries/${query.queryId}`);
      setReload(value => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete query.'));
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setPagination(value => ({ ...value, page: 1 }));
    setApplied({ q: filters.q.trim(), from: filters.from, to: filters.to });
  }

  return <section>
    <p className="eyebrow"><span>ADMIN</span> / QUERIES</p>
    <h1>Contact queries</h1>
    <form className="admin-filter-form" onSubmit={applyFilters}>
      <label>Search<input value={filters.q} maxLength="100" onChange={event => setFilters(value => ({ ...value, q: event.target.value }))} placeholder="Name, email, subject, or message"/></label>
      <label>From<input type="date" value={filters.from} onChange={event => setFilters(value => ({ ...value, from: event.target.value }))}/></label>
      <label>To<input type="date" value={filters.to} onChange={event => setFilters(value => ({ ...value, to: event.target.value }))}/></label>
      <button className="button primary">Apply filters</button>
    </form>
    {error && <p className="form-status error" role="alert">{error}</p>}
    {loading && <p role="status">Loading queries…</p>}
    {!loading && !error && items.length === 0 && <p className="muted-text">No queries match these filters.</p>}
    {!loading && items.length > 0 && <div className="admin-list">
      {items.map(query => <article className="admin-record" key={query.queryId}>
        <div className="admin-record-heading"><div><h2>{query.subject}</h2><p>{query.name} · <a href={`mailto:${query.email}`}>{query.email}</a></p></div>
          <span className={query.isRead ? 'status-pill read' : 'status-pill'}>{query.isRead ? 'Read' : 'Unread'}</span>
        </div>
        <details><summary>View message</summary><p className="admin-message">{query.message}</p></details>
        <time dateTime={query.createdAt}>{new Date(query.createdAt).toLocaleString()}</time>
        <div className="admin-actions">
          <button className="button secondary" onClick={() => updateReadStatus(query)}>{query.isRead ? 'Mark unread' : 'Mark read'}</button>
          <button className="button danger" onClick={() => removeQuery(query)}>Delete</button>
        </div>
      </article>)}
    </div>}
    <div className="admin-pagination">
      <button className="button secondary" disabled={pagination.page <= 1 || loading} onClick={() => setPagination(value => ({ ...value, page: value.page - 1 }))}>Previous</button>
      <span>Page {pagination.page} of {Math.max(pagination.pages, 1)}</span>
      <button className="button secondary" disabled={pagination.page >= pagination.pages || loading} onClick={() => setPagination(value => ({ ...value, page: value.page + 1 }))}>Next</button>
    </div>
  </section>;
}
