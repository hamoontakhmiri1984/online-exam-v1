// Access tokens stay in memory; the refresh token is an HttpOnly cookie.
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';

export { API_BASE_URL };

let accessToken: string | null = null;

export function setAuthToken(token: string | null): void {
  accessToken = token;
}

export function getAuthToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

// Concurrent 401 responses share one refresh request.
export type RefreshOutcome =
  | { status: 'ok'; token: string }
  | { status: 'expired' }
  | { status: 'unavailable' };

let refreshPromise: Promise<RefreshOutcome> | null = null;

export async function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res): Promise<RefreshOutcome> => {
        if (res.status === 401) return { status: 'expired' };
        if (!res.ok) return { status: 'unavailable' };
        const data = (await res.json().catch(() => null)) as {
          accessToken?: string;
        } | null;
        // A successful response without a token is unavailable, not an expired session.
        return data?.accessToken
          ? { status: 'ok', token: data.accessToken }
          : { status: 'unavailable' };
      })
      .catch((): RefreshOutcome => ({ status: 'unavailable' }))
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function refreshAccessToken(): Promise<string | null> {
  const outcome = await refreshSession();
  return outcome.status === 'ok' ? outcome.token : null;
}

// Notify the auth layer only when the refresh session is explicitly rejected.
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

// Retry once after refresh; only an explicit refresh rejection ends the session.
async function refreshForRetry(): Promise<boolean> {
  const outcome = await refreshSession();
  if (outcome.status === 'ok') {
    accessToken = outcome.token;
    return true;
  }
  if (outcome.status === 'expired') {
    onSessionExpired?.();
    return false;
  }
  throw new ApiError(
    503,
    'سرور موقتاً در دسترس نیست، چند لحظه‌ی دیگه دوباره تلاش کن'
  );
}

function errorMessageFrom(data: unknown, fallback: string): string {
  return data && typeof data === 'object' && 'error' in data
    ? String((data as { error?: unknown }).error)
    : fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  isRetryAfterRefresh = false
): Promise<T> {
  const { method = 'GET', body, signal } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      // Include the refresh cookie on cross-origin API requests.
      credentials: 'include',
    });
  } catch {
    // Status zero represents a transport failure, not an HTTP response.
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }

  // Retry once after refreshing; never recursively refresh the refresh endpoint.
  if (
    response.status === 401 &&
    !isRetryAfterRefresh &&
    path !== '/auth/refresh'
  ) {
    if (await refreshForRetry()) {
      return apiRequest<T>(path, options, true);
    }
  }

  // Do not parse empty responses such as 204 as JSON.
  const hasBody = response.status !== 204;
  const data = hasBody ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessageFrom(data, `درخواست با خطا مواجه شد (${response.status})`),
      data
    );
  }

  return data as T;
}

// Let the browser set the multipart boundary; share the JSON refresh/retry policy.
export type MultipartOptions = {
  method?: 'POST' | 'PUT' | 'PATCH';
  signal?: AbortSignal;

  fallbackMessage?: (status: number) => string;
};

export async function apiMultipartRequest<T>(
  path: string,
  formData: FormData,
  options: MultipartOptions = {},
  isRetryAfterRefresh = false
): Promise<T> {
  const { method = 'POST', signal, fallbackMessage } = options;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData,
      signal,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }

  if (response.status === 401 && !isRetryAfterRefresh) {
    if (await refreshForRetry()) {
      return apiMultipartRequest<T>(path, formData, options, true);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const fallback = fallbackMessage
      ? fallbackMessage(response.status)
      : `آپلود با خطا مواجه شد (${response.status})`;
    throw new ApiError(response.status, errorMessageFrom(data, fallback), data);
  }

  return data as T;
}
