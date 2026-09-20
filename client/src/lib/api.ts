import type { Contender, VoteResult } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getItems: (params: { category?: string; tier?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.tier) qs.set('tier', params.tier);
    if (params.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Contender[]>(`/items${suffix}`);
  },
  getCategories: () => request<string[]>('/categories'),
  getNextPair: (excludeIds: string[] = []) =>
    request<Contender[]>(`/arena/next${excludeIds.length ? `?exclude=${excludeIds.join(',')}` : ''}`),
  vote: (winnerId: string, loserId: string, voterId: string) =>
    request<VoteResult>('/vote', {
      method: 'POST',
      body: JSON.stringify({ winnerId, loserId, voterId }),
    }),
  addContender: (name: string, category: string | null, acceptedTerms: boolean) =>
    request<Contender>('/admin/items', {
      method: 'POST',
      body: JSON.stringify({ name, category, acceptedTerms }),
    }),
  updateContender: (id: string, patch: Partial<{ name: string; category: string | null; active: boolean }>) =>
    request<Contender>(`/admin/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteContender: (id: string) => request<void>(`/admin/items/${id}`, { method: 'DELETE' }),
  resetContender: (id: string) => request<Contender>(`/admin/items/${id}/reset`, { method: 'POST' }),
  resetAll: () => request<void>('/admin/reset-all', { method: 'POST' }),
};
