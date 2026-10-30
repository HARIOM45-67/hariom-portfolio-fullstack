import { Link } from 'react-router-dom';

export default function NotFound() {
  return <main className="not-found wrap">
    <p className="eyebrow"><span>404</span> / PAGE NOT FOUND</p>
    <h1>This page doesn't exist.</h1>
    <p className="muted-text">The link may be incorrect, or the page may have moved.</p>
    <Link className="button primary" to="/">Return to portfolio</Link>
  </main>;
}
