import { useState } from 'react';
import { api } from '../api.js';
import { CONSENT_PARAGRAPHS, CONSENT_TITLE } from '../consentText.js';

/** Shown to students who have not accepted the current consent text. Nothing else is available until they accept. */
export default function Consent({ user, onAccepted, onDecline }) {
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  async function accept() {
    setError('');
    try { await api('/privacy/consent', { method: 'POST', body: { accept: true } }); onAccepted(); }
    catch (e) { setError(e.message); }
  }
  return (
    <main className="auth">
      <section className="card">
        <h1>{CONSENT_TITLE}</h1>
        <p className="muted">Hello {user.name}. Please read this before using the application.</p>
        {CONSENT_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
        <label><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read this and agree to take part.</label>
        {error && <p className="error" role="alert">{error}</p>}
        <p><button className="primary" disabled={!agree} onClick={accept}>I agree</button> <button onClick={onDecline}>No thanks, sign out</button></p>
      </section>
    </main>
  );
}
