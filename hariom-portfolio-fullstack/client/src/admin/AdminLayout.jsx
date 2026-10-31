import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function AdminLayout() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api.post('/api/auth/logout');
      navigate('/admin/login', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to log out.'));
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-layout">
    <header className="admin-header">
      <a className="brand" href="/">Hariom <span className="accent">/ Admin</span></a>
      <nav aria-label="Admin navigation">
        <NavLink to="/admin/dashboard">Dashboard</NavLink>
        <NavLink to="/admin/queries">Queries</NavLink>
        <NavLink to="/admin/resume">Resume</NavLink>
        <NavLink to="/admin/projects">Projects</NavLink>
      </nav>
      <button className="button secondary" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Log out'}</button>
    </header>
    <main className="admin-content">
      {error && <p className="form-status error" role="alert">{error}</p>}
      <Outlet/>
    </main>
  </div>;
}
