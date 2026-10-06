/**
 * A hash router in twenty lines.
 *
 * Hash routing rather than history routing because the site is served from GitHub
 * Pages, which has no rewrite rules — a deep link to a history-routed path would
 * 404 on reload.
 */

import { useEffect, useState } from 'react';

/** The current route, with the leading `#/` stripped. Empty string is the index. */
export function useRoute(): string {
  const [route, setRoute] = useState(current);

  useEffect(() => {
    const onChange = () => setRoute(current());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function current(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

/** Navigate to a route, which also pushes a history entry. */
export function navigate(route: string): void {
  window.location.hash = route ? `/${route}` : '/';
}

/** Scroll to the top whenever the route changes, as a page navigation would. */
export function useScrollReset(route: string): void {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);
}
