import { ServiceError } from './http';

/**
 * ============================================================================
 * REST TRANSPORT
 * ============================================================================
 *
 * Every service talks to the Express API through this one client.
 *
 * It supports both HttpOnly session cookies (credentials: 'include') and
 * Authorization: Bearer <token> headers to guarantee cross-origin reliability
 * across all browser privacy settings (Safari ITP, third-party cookie blocking,
 * etc.) between Vercel and Render.
 */

const ADMIN_TOKEN_KEY = 'shelina_admin_token';
const CUSTOMER_TOKEN_KEY = 'shelina_customer_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY) || sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCustomerToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
      sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

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

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (
    init?.body !== undefined &&
    !(typeof FormData !== 'undefined' && init.body instanceof FormData) &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach auth token if available and not already set
  if (!headers['Authorization']) {
    const adminToken = getAdminToken();
    const customerToken = getCustomerToken();

    if (
      adminToken &&
      (path.startsWith('/admin') ||
        path.startsWith('/auth/admin') ||
        path.startsWith('/products') ||
        path.startsWith('/categories') ||
        path.startsWith('/brands') ||
        path.startsWith('/homepage') ||
        path.startsWith('/banners') ||
        path.startsWith('/seo') ||
        path.startsWith('/settings') ||
        path.startsWith('/media'))
    ) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    } else if (customerToken && (path.startsWith('/auth/customer') || path.startsWith('/orders'))) {
      headers['Authorization'] = `Bearer ${customerToken}`;
    }
  }

  try {
    response = await fetch(resolveUrl(path), {
      credentials: 'include',
      headers,
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
    // Clear stale admin token on unauthorized response for admin routes
    if (response.status === 401 && (path.startsWith('/admin') || path.startsWith('/auth/admin'))) {
      setAdminToken(null);
    }
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
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
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
