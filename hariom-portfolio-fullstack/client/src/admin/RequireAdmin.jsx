import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function RequireAdmin() {
  const [state, setState] = useState({ status: 'loading', error: '' });
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/auth/me', { signal: controller.signal })
      .then(() => setState({ status: 'authenticated', error: '' }))
      .catch(error => {
        if (controller.signal.aborted) return;
        if (error.response?.status === 401) {
          setState({ status: 'unauthenticated', error: '' });
        } else {
          setState({ status: 'error', error: getApiErrorMessage(error, 'Unable to verify your admin session.') });
        }
      });
    return () => controller.abort();
  }, []);

  if (state.status === 'loading') return <main className="admin-shell"><p role="status">Checking admin session…</p></main>;
  if (state.status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (state.status === 'error') {
    return <main className="admin-shell"><p className="form-status error" role="alert">{state.error}</p></main>;
  }
  return <Outlet/>;
}
