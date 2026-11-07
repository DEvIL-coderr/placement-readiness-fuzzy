import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { go } from '../hash.js';
import { CONSENT_PARAGRAPHS, CONSENT_TITLE } from '../consentText.js';

export function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', targetRole: 'general', consent: false });
  const [roles, setRoles] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { setRoles({ general: 'General / Undecided', software_developer: 'Software Developer', data_analyst: 'Data / Business Analyst', it_services: 'IT Services (mass recruiter)', infra_network: 'Infrastructure / Network Engineer' }); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register({ ...form, consent: form.consent });
      go('/');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="auth">
      <form onSubmit={submit} className="card">
        <h1>{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
        <p className="muted">Track weekly preparation and see how placement-ready you are.</p>
        {mode === 'register' && <label>Name<input value={form.name} onChange={set('name')} required minLength={2} /></label>}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {mode === 'register' && (
          <label>Target role
            <select value={form.targetRole} onChange={set('targetRole')}>{Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
        )}
        {mode === 'register' && (
          <details>
            <summary>{CONSENT_TITLE} (read before registering)</summary>
            {CONSENT_PARAGRAPHS.map((p, i) => <p key={i} className="small">{p}</p>)}
          </details>
        )}
        {mode === 'register' && <label><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} required /> I have read the study consent and agree to take part.</label>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
        <p className="muted small">{mode === 'login' ? <>New here? <a href="#/register">Create an account</a></> : <>Already registered? <a href="#/login">Sign in</a></>}</p>
      </form>
    </main>
  );
}
