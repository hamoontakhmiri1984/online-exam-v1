// لایه‌ی مشترک ارتباط با بک‌اند واقعی. توکن دسترسی (accessToken) فقط تو
// حافظه نگه داشته می‌شه، نه localStorage - چون عمرش کوتاهه (۱۵ دقیقه) و
// بعد از رفرش صفحه دوباره از رو کوکی httpOnly رفرش (که مرورگر خودکار
// می‌فرسته) با bootstrapSession() تو authApi.ts ساخته می‌شه.

// آدرس بک‌اند از یه متغیر محیطی Vite خونده می‌شه - تا وقتی .env نداریم،
// یه مقدار پیش‌فرض محلی می‌ذاریم. توجه: بدون پیشوند /api چون سرور روت‌ها
// رو مستقیم رو ریشه mount کرده (/auth, /groups, ...)
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

// خطای یکسان برای همه‌ی خطاهای بک‌اند - به‌جای این‌که هر api/*.ts خودش
// جدا شکل خطای fetch رو تفسیر کنه، همه از همین یک نوع استفاده می‌کنن.
// status رو نگه می‌داریم تا لایه‌های بالاتر (مثلاً هوک‌ها) بتونن رفتار
// متفاوتی برای 401/403/404/... داشته باشن، بدون این‌که به جزئیات fetch
// وابسته بشن
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

// چند درخواست هم‌زمان که هرکدوم با 401 مواجه می‌شن نباید هرکدوم جدا
// /auth/refresh رو صدا بزنن - همه‌شون منتظر همین یه promise مشترک می‌مونن.
// export شده چون bootstrapSession (تو authApi.ts) هم باید از همین promise
// مشترک استفاده کنه، نه این‌که خودش جدا apiRequest('/auth/refresh') رو صدا
// بزنه - وگرنه (مثلاً با دوبار اجرا شدن useEffect تو React StrictMode) دو
// درخواست رفرش هم‌زمان می‌رفت، هرکدوم سمت سرور یه sid/نشست جدید می‌ساخت و
// چون سیستم تک‌نشستیه، دومی اولی رو خودکار force-logout می‌کرد (باگ #۴)
//
// نتیجه‌ی refresh سه‌حالته‌ست، نه «توکن یا null»:
//   ok          توکن تازه گرفتیم
//   expired     سرور صریحاً ۴۰۱ داد: رفرش‌توکن باطل/منقضی/جایگزین‌شده - نشست
//               واقعاً تموم شده
//   unavailable شبکه قطع، ۵xx (مثلاً Redis/DB موقتاً قطع)، ۴۲۹ و ...: نمی‌دونیم
//               نشست معتبره یا نه. این حالت نباید کاربر رو logout کنه - قبلاً
//               هر شکستی «null» بود و با یه قطعیِ چند‌ثانیه‌ایِ سرور همه‌ی
//               کاربرها به /login پرت می‌شدن
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
        // ۲xx بدون توکن یعنی پاسخ خراب - قطعیِ نشست نیست
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

// سازگار با کدهای قبلی (bootstrapSession): فقط توکن یا null
export async function refreshAccessToken(): Promise<string | null> {
  const outcome = await refreshSession();
  return outcome.status === 'ok' ? outcome.token : null;
}

// وقتی حتی رفرش هم جواب نده (رفرش‌توکن باطل/منقضی شده)، یعنی نشست واقعاً
// تمومه - authApi.ts این رو ست می‌کنه تا سشن محلی رو پاک و کاربر رو به
// لاگین بفرسته، بدون این‌که این فایل چیزی از React/routing بدونه
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

// تابع اصلی و تنها نقطه‌ای که واقعاً fetch صدا می‌زنه. هر api/*.ts فقط
// یه wrapper نازک دور همینه، مثلاً:
//   export function getExams() { return apiRequest<Exam[]>('/exams'); }
//   export function addExam(exam) {
//     return apiRequest<Exam>('/exams', { method: 'POST', body: exam });
//   }
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
      // کوکی refresh (httpOnly) رو با هر درخواست می‌فرسته/می‌گیره - چون
      // کلاینت (۵۱۷۳) و سرور (۴۰۰۰) دو origin جدان، بدون این کوکی رد و بدل
      // نمی‌شه، حتی با همون‌مرورگر
      credentials: 'include',
    });
  } catch {
    // خطای شبکه (سرور خاموشه، اینترنت قطعه، و ...) - نه یه خطای معتبر
    // HTTP، پس status صفر می‌ذاریم تا از خطاهای واقعی سرور قابل‌تشخیص باشه
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }

  // accessToken منقضی شده - قبل از این‌که خطا رو به بالا پرتاب کنیم، یه بار
  // تلاش می‌کنیم با کوکی refresh یکی تازه بگیریم و همین درخواست رو تکرار
  // کنیم. مسیر /auth/refresh خودش رو دوباره retry نمی‌کنیم وگرنه اگه رفرش‌توکن
  // هم باطل باشه، لوپ بی‌نهایت می‌شه
  if (
    response.status === 401 &&
    !isRetryAfterRefresh &&
    path !== '/auth/refresh'
  ) {
    const outcome = await refreshSession();
    if (outcome.status === 'ok') {
      accessToken = outcome.token;
      return apiRequest<T>(path, options, true);
    }
    if (outcome.status === 'expired') {
      // سرور صریحاً گفته نشست تموم شده
      onSessionExpired?.();
    } else {
      // نتیجه‌ی نشست نامعلومه (سرور/شبکه مشکل داره): logout نمی‌کنیم و
      // خطای «موقتاً در دسترس نیست» می‌دیم تا کاربر بعداً دوباره تلاش کنه
      throw new ApiError(
        503,
        'سرور موقتاً در دسترس نیست، چند لحظه‌ی دیگه دوباره تلاش کن'
      );
    }
  }

  // پاسخ‌های بدون بدنه (مثل 204 موقع حذف) رو نباید سعی کنیم JSON پارس کنیم
  const hasBody = response.status !== 204;
  const data = hasBody ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    // خروجی خطای بک‌اند واقعی همیشه شکل { error: string } ـه (نه message)
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : null) ?? `درخواست با خطا مواجه شد (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
