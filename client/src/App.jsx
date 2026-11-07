import { AuthProvider, useAuth } from './auth.jsx';
import { go, useRoute } from './hash.js';
import { AuthPage } from './pages/Auth.jsx';
import Admin from './pages/Admin.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Demo from './pages/Demo.jsx';
import Faculty from './pages/Faculty.jsx';
import Interview from './pages/Interview.jsx';
import Log from './pages/Log.jsx';
import Practice from './pages/Practice.jsx';
import Questions from './pages/Questions.jsx';

const NAV = [
  ['/', 'Dashboard'],
  ['/practice', 'Practice'],
  ['/interview', 'Interview practice'],
  ['/questions', 'Top questions'],
  ['/log', 'Log & profile'],
  ['/demo', 'Demo'],
];

function Shell() {
  const { user, ready, logout } = useAuth();
  const { path } = useRoute();

  if (!ready) return <p className="muted pad">Loading…</p>;
  if (!user) {
    if (path !== '/register' && path !== '/login') { go('/login'); return null; }
    return <AuthPage mode={path === '/register' ? 'register' : 'login'} />;
  }

  const isFaculty = user.role === 'faculty';
  const items = isFaculty ? [['/faculty', 'Faculty rating']] : user.role === 'admin' ? [...NAV, ['/admin', 'Admin']] : NAV;
  let page;
  if (isFaculty) {
    page = <Faculty />;
    return (
      <>
        <header className="top">
          <strong className="brand">Placement Readiness</strong>
          <nav>{items.map(([to, label]) => <a key={to} href={`#${to}`} className="active">{label}</a>)}</nav>
          <span className="who">{user.name} <button onClick={() => { logout(); go('/login'); }}>Sign out</button></span>
        </header>
        <main className="page">{page}</main>
      </>
    );
  }
  switch (path) {
    case '/practice': page = <Practice />; break;
    case '/interview': page = <Interview />; break;
    case '/questions': page = <Questions />; break;
    case '/log': page = <Log />; break;
    case '/demo': page = <Demo />; break;
    case '/admin': page = user.role === 'admin' ? <Admin /> : <p className="error">Admins only.</p>; break;
    default: page = <Dashboard />;
  }
  return (
    <>
      <header className="top">
        <strong className="brand">Placement Readiness</strong>
        <nav>{items.map(([to, label]) => <a key={to} href={`#${to}`} className={path === to ? 'active' : ''}>{label}</a>)}</nav>
        <span className="who">{user.name} <button onClick={() => { logout(); go('/login'); }}>Sign out</button></span>
      </header>
      <main className="page">{page}</main>
    </>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
