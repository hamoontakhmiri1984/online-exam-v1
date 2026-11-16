// Access tokens stay in memory; the refresh token is an HttpOnly cookie.
export type ServiceLocation = { hostname: string; protocol: string };

const LOCAL_SERVICE_URL = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;
const CODESPACES_FRONTEND_HOST = /-5173\.app\.github\.dev$/i;
const CODESPACES_API_HOST = /-4000\.app\.github\.dev$/i;

const credentialEndpoints = new Set([
  '/auth/login/password',
  '/auth/google',
  '/auth/otp/verify',
]);

/**
 * In Codespaces, use the same-origin Vite proxy for API and Socket.IO requests.
 * This avoids browser CORS and forwarded-private-port authentication issues.
 * Keep explicitly configured external API URLs intact.
 */
export function resolveServiceBaseUrl(
  configured: string | undefined,
  currentLocation?: ServiceLocation,
): string {
  const value = configured?.trim();
  const location =
    currentLocation ??
    (typeof window !== 'undefined'
      ? {
          hostname: window.location.hostname,
          protocol: window.location.protocol,
        }
      : undefined);
  const hostname = location?.hostname.toLowerCase();

  if (location && hostname && CODESPACES_FRONTEND_HOST.test(hostname)) {
    // A production-style /api setting accidentally hits Vite's SPA on Codespaces.
    // Forwarded API URLs can also point to a previous Codespace.
    const isLocalUrl =
      !value ||
      LOCAL_SERVICE_URL.test(value) ||
      /^\/(?:api|__api)\/?$/i.test(value);
    let isForwardedApiUrl = false;

    if (value) {
      try {
        const configuredUrl = new URL(value);
        isForwardedApiUrl =
          configuredUrl.protocol === location.protocol &&
          CODESPACES_API_HOST.test(configuredUrl.hostname);
      } catch {
        // Preserve invalid/custom values so configuration issues remain visible.
      }
    }

    if (isLocalUrl || isForwardedApiUrl) return '';
  }

  return value || 'http://localhost:4000';
}

const API_BASE_URL = resolveServiceBaseUrl(
  import.meta.env.VITE_API_BASE_URL as string | undefined,
);

export { API_BASE_URL };

export function buildApiUrl(path: string, baseUrl = API_BASE_URL): string {
  const proxyPrefix = baseUrl === '' ? '/__api' : '';
  return `${baseUrl}${proxyPrefix}${path}`;
}

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
  headers?: Record<string, string>;
  keepalive?: boolean;
};

// Concurrent 401 responses share one refresh request.
export type RefreshOutcome =
  | { status: 'ok'; token: string }
  | { status: 'expired' }
  | { status: 'unavailable' };

export const AUTH_REQUEST_TIMEOUT_MS = 15_000;
let refreshPromise: Promise<RefreshOutcome> | null = null;
let refreshController: AbortController | null = null;
let pendingCredentialRequests = 0;

export async function refreshSession(): Promise<RefreshOutcome> {
  if (pendingCredentialRequests > 0) return { status: 'unavailable' };
  if (!refreshPromise) {
    refreshController = new AbortController();
    const signal = AbortSignal.any([
      refreshController.signal,
      AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    ]);
    refreshPromise = fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      signal,
    })
      .then(async (res): Promise<RefreshOutcome> => {
        if (signal.aborted) return { status: 'unavailable' };
        if (res.status === 401) return { status: 'expired' };
        if (!res.ok) return { status: 'unavailable' };
        const data = (await res.json().catch(() => null)) as {
          accessToken?: string;
        } | null;
        // A successful response without a token is unavailable, not an expired session.
        return !signal.aborted && data?.accessToken
          ? { status: 'ok', token: data.accessToken }
          : { status: 'unavailable' };
      })
      .catch((): RefreshOutcome => ({ status: 'unavailable' }))
      .finally(() => {
        refreshPromise = null;
        refreshController = null;
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
  const previousToken = accessToken;
  const outcome = await refreshSession();
  if (accessToken !== previousToken) return accessToken !== null;
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
  if (!credentialEndpoints.has(path)) {
    return requestJson<T>(path, options, isRetryAfterRefresh);
  }

  // An older refresh must not replace the session cookie from a new login.
  pendingCredentialRequests++;
  refreshController?.abort();
  const timeout = AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    const data = await requestJson<T>(path, { ...options, signal }, true);
    timeout.throwIfAborted();
    return data;
  } catch (error) {
    if (timeout.aborted) {
      throw new ApiError(504, 'پاسخ ورود از سرور نرسید. دوباره تلاش کنید.');
    }
    throw error;
  } finally {
    pendingCredentialRequests--;
  }
}

async function requestJson<T>(
  path: string,
  options: RequestOptions,
  isRetryAfterRefresh: boolean,
): Promise<T> {
  const { method = 'GET', body, signal, headers: extraHeaders, keepalive } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      keepalive,
      // Include the refresh cookie on cross-origin API requests.
      credentials: 'include',
    });
  } catch {
    // Status zero represents a transport failure, not an HTTP response.
    throw new ApiError(0, 'ارتباط با API برقرار نشد؛ مطمئن شوید سرور پورت ۴۰۰۰ اجراست.');
  }

  // Retry protected requests once with the renewed access token.
  if (
    response.status === 401 &&
    !isRetryAfterRefresh &&
    path !== '/auth/refresh'
  ) {
    if (await refreshForRetry()) {
      return requestJson<T>(path, options, true);
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
    response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: formData,
      signal,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'ارتباط با API برقرار نشد؛ مطمئن شوید سرور پورت ۴۰۰۰ اجراست.');
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
