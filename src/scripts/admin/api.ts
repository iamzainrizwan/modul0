// the worker behind the admin: the token (kept in this browser only), calls
// with it, and what each failure means in words
const KEY = 'modul0-admin';
let api = '';
let token = '';

export const store = {
  get: () => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } },
  set: (v: string) => { try { localStorage.setItem(KEY, v); } catch {} },
  clear: () => { try { localStorage.removeItem(KEY); } catch {} },
};

export function setup(url: string) {
  api = url;
  token = store.get();
}
export const hasToken = () => !!token;
export function login(t: string) { token = t; store.set(t); }
export function logout() { token = ''; store.clear(); }

export class ApiError extends Error {
  constructor(public status: number, public code = '') { super(code || String(status)); }
}

export async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  if (typeof init.body === 'string') headers.set('content-type', 'application/json');
  const res = await fetch(`${api}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error);
  return data;
}

export function explain(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Couldn’t reach the API.';
  if (e.status === 401) return 'Wrong token.';
  if (e.status === 429) return 'Too many requests: wait a minute.';
  if (e.code === 'conflict') return 'That changed on GitHub since it loaded (or the name is taken). Reload and try again.';
  if (e.code === 'no-github') return 'Editing needs the worker’s GITHUB_TOKEN secret.';
  if (e.code === 'bad-json') return 'That isn’t valid JSON.';
  if (e.code === 'too-long') return 'That’s too big to save.';
  if (e.code === 'draft') return 'Drafts never go to GitHub: that save should have gone to the drafts store.';
  if (e.code === 'too-many') return 'That’s 50 drafts already: publish or delete one.';
  return 'That failed. Try again.';
}

// a file in the repo, as the worker lists it
export type RepoFile = { name: string; path: string; sha: string; text: string };

export const saveFile = (path: string, data: { text: string } | { base64: string }, sha?: string) =>
  call<{ sha: string }>('/admin/files', { method: 'PUT', body: JSON.stringify({ path, sha, ...data }) }).then((d) => d.sha);

// drafts: in the worker's d1, never in the repo (its history is public)
export type Draft = { name: string; text: string; updated: string; images: string[] };
export const loadDrafts = () =>
  call<{ drafts: { slug: string; text: string; updated: string; images: string[] }[] }>('/admin/drafts').then((d) =>
    d.drafts.map(({ slug, ...rest }) => ({ name: slug, ...rest })),
  );
export const saveDraft = (slug: string, text: string) => call('/admin/drafts', { method: 'PUT', body: JSON.stringify({ slug, text }) });
export const deleteDraft = (slug: string) => call(`/admin/drafts?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
export const saveDraftImage = (slug: string, name: string, base64: string) =>
  call('/admin/drafts/images', { method: 'PUT', body: JSON.stringify({ slug, name, base64 }) });
export async function draftImage(slug: string, name: string): Promise<Blob> {
  const res = await fetch(`${api}/admin/drafts/images?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.blob();
}

export const deleteFile = (path: string, sha: string) =>
  call(`/admin/files?path=${encodeURIComponent(path)}&sha=${sha}`, { method: 'DELETE' });
