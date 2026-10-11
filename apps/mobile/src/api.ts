import type { Catalog, User } from '@wallp/shared';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  token?: string | null,
  body?: unknown,
  method = 'GET',
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body instanceof FormData ? 180_000 : 30_000);
  try {
    const form = body instanceof FormData;
    const response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!form && body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, data.message || 'Request failed.');
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Unable to reach wallp. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}
export const api = {
  catalog: (cursor?: string) =>
    request<Catalog>(`/catalog${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  me: (token: string) => request<{ user: User; likedIds: string[] }>('/me', token),
  login: (idToken: string) =>
    request<{ token: string; user: User }>('/auth/google', null, { idToken }, 'POST'),
  like: (id: string, liked: boolean, token: string) =>
    request(`/wallpapers/${id}/like`, token, null, liked ? 'PUT' : 'DELETE'),
};
