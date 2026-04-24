import { API_BASE_URL } from '@/lib/constants';

/**
 * Rewrites URLs served by the Nest media routes to use the API origin from
 * NEXT_PUBLIC_API_URL. Fixes broken product image URLs when the DB has the wrong host/port
 * (e.g. import script used localhost:3000 but API is on 3002 in Docker).
 */
export function resolveBackendMediaUrl(url: string | null | undefined): string {
  if (url == null || url === '') return '';

  let origin: string;
  try {
    const parsed = new URL(API_BASE_URL);
    origin = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }

  if (url.startsWith('/')) {
    return `${origin}${url}`;
  }

  try {
    const u = new URL(url);
    if (u.pathname.includes('/media/files/')) {
      return `${origin}${u.pathname}${u.search}`;
    }
  } catch {
    return url;
  }

  return url;
}
