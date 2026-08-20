import { ServiceError } from './http';

/**
 * ============================================================================
 * REST TRANSPORT
 * ============================================================================
 *
 * Every service now talks to the Stage 5 Express API through this one client.
 *
 * `VITE_API_BASE_URL` is the ONLY backend value the browser ever sees, and it
 * is a public URL. DATABASE_URL, SESSION_SECRET and password hashes live on
 * the server and are never bundled.
 *
 * `credentials: 'include'` sends the HttpOnly session cookies. Those cookies
 * cannot be read by JavaScript, so no token is ever held in frontend state.
 */

function getBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!envUrl) return '/api';
  let normalized = envUrl.replace(/\/+$/, '');
  if ((normalized.startsWith('http://') || normalized.startsWith('https://')) && !normalized.endsWith('/api')) {
    normalized = `${normalized}/api`;
  }
  return normalized;
}

export const API_BASE_URL: string = getBaseUrl();

function resolveUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
  /** Pagination for list endpoints. */
  meta?: { total: number; page: number; pageSize: number; pageCount: number };
}

/** Error carrying the backend's field-level validation messages. */
export class ApiValidationError extends ServiceError {
  constructor(
    message: string,
    readonly fields: Record<string, string>,
    status = 400,
  ) {
    super(message, status);
    this.name = 'ApiValidationError';
  }
}

/**
 * Performs the call and returns the WHOLE envelope.
 *
 * List endpoints carry pagination in `meta`, which `request` discards when it
 * unwraps `data`. Error handling is identical either way.
 */
async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  let response: Response;

  try {
    response = await fetch(resolveUrl(path), {
      credentials: 'include',
      headers:
        init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    // Network-level failure: the API is unreachable. Never pretend it worked.
    throw new ServiceError(
      'Could not reach the server. Check your connection and try again.',
      0,
    );
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.message ?? `Request failed (${response.status}).`;
    if (payload?.errors) {
      throw new ApiValidationError(message, payload.errors, response.status);
    }
    throw new ServiceError(message, response.status);
  }

  return payload;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const payload = await requestEnvelope<T>(path, init);
  return payload.data as T;
}

/** Drops undefined/empty values so query strings stay clean. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
      continue;
    }
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /**
   * Full envelope, for list endpoints that need `meta` alongside `data`.
   * The generic is the element type, so `raw<Order[]>` reads naturally.
   */
  raw: <T>(path: string) =>
    requestEnvelope<T>(path) as Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }>,
};
