import { useSyncExternalStore } from 'react';

// No router library and no single-spa import: the Shell's single-spa patches `history`, fires
// `popstate` after every in-page navigation and `single-spa:routing-event` after each reroute.
function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener('single-spa:routing-event', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('single-spa:routing-event', onChange);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function useSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search);
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to);
}

export type Route =
  | { page: 'list' }
  | { page: 'detail'; id: string }
  | { page: 'test-error' }
  | { page: 'not-found' };

/** The Catalog route table. */
export function match(pathname: string): Route {
  if (pathname === '/catalog' || pathname === '/catalog/') return { page: 'list' };
  if (pathname === '/catalog/test-error') return { page: 'test-error' };
  const detail = /^\/catalog\/([\w-]+)$/.exec(pathname);
  return detail?.[1] ? { page: 'detail', id: detail[1] } : { page: 'not-found' };
}
