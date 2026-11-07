import { useEffect, useState } from 'react';

/** Tiny hash router: #/path?query */
export function useRoute() {
  const read = () => {
    const h = window.location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = h.split('?');
    return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path) => { window.location.hash = path; };
