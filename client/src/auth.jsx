import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const logout = () => setUser(null);
    window.addEventListener('auth:logout', logout);
    if (!tokenStore.get()) setReady(true);
    else api('/auth/me').then((d) => setUser(d.user)).catch(() => tokenStore.clear()).finally(() => setReady(true));
    return () => window.removeEventListener('auth:logout', logout);
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(d.token);
    setUser(d.user);
  }, []);
  const register = useCallback(async (body) => {
    const d = await api('/auth/register', { method: 'POST', body });
    tokenStore.set(d.token);
    setUser(d.user);
  }, []);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
