export const PROFILE_KEY = 'royaumes-open-profile';

// This selects a public view. It is deliberately not an authentication token.
export function publicRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const profile = sessionStorage.getItem(PROFILE_KEY);
  if (profile) headers.set('X-Realm-Profile', profile);
  return fetch(path, { ...options, headers });
}
