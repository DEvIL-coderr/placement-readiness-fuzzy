import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { go } from '../hash.js';

function YourData() {
  const { logout } = useAuth();
  const [pw, setPw] = useState('');
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  async function download() {
    setMsg('');
    try {
      const res = await api('/privacy/export', { raw: true });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = 'my-placement-readiness-data.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMsg(e.message); }
  }
  async function remove(e) {
    e.preventDefault(); setMsg('');
    try { await api('/privacy/account', { method: 'DELETE', body: { password: pw } }); logout(); go('/login'); }
    catch (err) { setMsg(err.message); }
  }
  return (
    <section className="card span-12">
      <h3>Your data</h3>
      <p className="muted small">You can download everything stored about you, or withdraw from the study and delete your account and all your data. Deletion cannot be undone.</p>
      <p><button onClick={download}>Download my data (JSON)</button> <button onClick={() => setOpen(!open)}>{open ? 'Cancel' : 'Withdraw and delete my account'}</button></p>
      {open && (
        <form onSubmit={remove}>
          <label>Confirm with your password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" /></label>
          <button className="primary" type="submit">Permanently delete everything</button>
        </form>
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
    </section>
  );
}

export default function Log() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ projects: '', mock: '', note: '' });
  const [items, setItems] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [msg, setMsg] = useState('');
  const [profile, setProfile] = useState({ targetRole: user.targetRole, placementDate: user.placementDate ? user.placementDate.slice(0, 10) : '' });
  const roles = { general: 'General / Undecided', software_developer: 'Software Developer', data_analyst: 'Data / Business Analyst', it_services: 'IT Services (mass recruiter)', infra_network: 'Infrastructure / Network Engineer' };

  const load = () => {
    api('/progress/practical').then((d) => setItems(d.items)).catch(() => {});
    api('/progress/weekly').then((d) => setWeekly(d.weeks)).catch(() => {});
  };
  useEffect(load, []);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    const body = {};
    if (form.projects !== '') body.projects = Number(form.projects);
    if (form.mock !== '') body.mock = Number(form.mock);
    if (form.note) body.note = form.note;
    try { await api('/progress/practical', { method: 'POST', body }); setMsg('Saved for this week.'); setForm({ projects: '', mock: '', note: '' }); load(); }
    catch (err) { setMsg(err.message); }
  }
  async function saveProfile(e) {
    e.preventDefault();
    const d = await api('/auth/me', { method: 'PATCH', body: { targetRole: profile.targetRole, placementDate: profile.placementDate || null } });
    setUser(d.user);
    setMsg('Profile updated.');
  }

  return (
    <>
      <h1>Weekly log &amp; profile</h1>
      <div className="grid">
        <form className="card span-6" onSubmit={save}>
          <h3>Projects &amp; mock interviews</h3>
          <p className="muted small">Quizzes are recorded automatically. Add a 0–100 self-assessment of your project work and your latest mock-interview score.</p>
          <label>Project quality / progress (0–100)<input type="number" min="0" max="100" value={form.projects} onChange={(e) => setForm({ ...form, projects: e.target.value })} /></label>
          <label>Mock interview score (0–100)<input type="number" min="0" max="100" value={form.mock} onChange={(e) => setForm({ ...form, mock: e.target.value })} /></label>
          <label>Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} /></label>
          <button className="primary" disabled={form.projects === '' && form.mock === ''}>Save this week</button>
          {msg && <p className="muted small" role="status">{msg}</p>}
        </form>
        <form className="card span-6" onSubmit={saveProfile}>
          <h3>Target &amp; timeline</h3>
          <label>Target role<select value={profile.targetRole} onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}>{Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Expected placement date (sets the forecast horizon)<input type="date" value={profile.placementDate} onChange={(e) => setProfile({ ...profile, placementDate: e.target.value })} /></label>
          <button className="primary">Save profile</button>
        </form>
        <section className="card span-6">
          <h3>Weekly activity</h3>
          {weekly.length === 0 ? <p className="muted">No quiz attempts yet.</p> : (
            <table><thead><tr><th>Week of</th><th>Questions</th><th>Accuracy</th></tr></thead>
              <tbody>{[...weekly].reverse().map((w) => <tr key={w.date}><td>{w.date}</td><td>{w.attempted}</td><td>{w.accuracy === null ? '—' : `${w.accuracy}%`}</td></tr>)}</tbody></table>
          )}
        </section>
        <section className="card span-6">
          <h3>Practical log</h3>
          {items.length === 0 ? <p className="muted">Nothing logged yet.</p> : (
            <table><thead><tr><th>Week of</th><th>Projects</th><th>Mock</th></tr></thead>
              <tbody>{items.map((i) => <tr key={i._id}><td>{i.weekStart}</td><td>{i.projects ?? '—'}</td><td>{i.mock ?? '—'}</td></tr>)}</tbody></table>
          )}
        </section>
        <YourData />
      </div>
    </>
  );
}
