import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const update = (event) => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not send your message.');
      setStatus({ type: 'success', text: 'Thanks! Your message has been received.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', text: error.message || 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return <form className="contact-form" onSubmit={submit} aria-busy={busy}>
    <div className="form-row">
      <label htmlFor="contact-name">Full name<input id="contact-name" name="name" autoComplete="name" value={form.name} onChange={update} minLength="2" maxLength="80" required placeholder="Your name" /></label>
      <label htmlFor="contact-email">Email address<input id="contact-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} maxLength="120" required placeholder="you@example.com" /></label>
    </div>
    <label htmlFor="contact-subject">Subject<input id="contact-subject" name="subject" value={form.subject} onChange={update} minLength="2" maxLength="120" required placeholder="What would you like to discuss?" /></label>
    <label htmlFor="contact-message">Message<textarea id="contact-message" name="message" value={form.message} onChange={update} minLength="10" maxLength="3000" required rows="5" placeholder="Tell me a little about it…" /></label>
    <button className="button primary" disabled={busy}>{busy ? 'Sending…' : 'Send message'} <Send size={15}/></button>
    {status.text && <p className={`form-status ${status.type}`} role="status">{status.type === 'success' && <CheckCircle2 size={16}/>} {status.text}</p>}
  </form>;
}