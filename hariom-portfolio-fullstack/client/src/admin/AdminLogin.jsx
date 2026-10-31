import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../lib/api.js';

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/auth/login', credentials);
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to sign in.'));
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-shell">
    <form className="contact-form admin-login" onSubmit={submit} aria-busy={busy}>
      <Link to="/" className="admin-back">← Back to portfolio</Link>
      <h1>Admin sign in</h1>
      <label htmlFor="admin-email">Email address<input id="admin-email" name="email" type="email" autoComplete="username" required maxLength="254" value={credentials.email} onChange={event => setCredentials(value => ({ ...value, email: event.target.value }))}/></label>
      <label htmlFor="admin-password">Password<input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength="72" value={credentials.password} onChange={event => setCredentials(value => ({ ...value, password: event.target.value }))}/></label>
      <button className="button primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {error && <p className="form-status error" role="alert">{error}</p>}
    </form>
  </main>;
}
