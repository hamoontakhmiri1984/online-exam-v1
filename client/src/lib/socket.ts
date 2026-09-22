// اتصال سوکت به بک‌اند - فعلاً فقط برای شنیدن رویداد force-logout (وقتی یه
// نشست دیگه با همین حساب باز می‌شه، سرور همین سوکت رو قطع می‌کنه). اتصال
// realtime نوتیفیکیشن‌های واقعی (notificationApi.ts) هنوز فاز جدایی داره
// و به این فایل ربطی نداره.
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL: string =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  'http://localhost:4000';

let socket: Socket | null = null;

// وقتی سرور نتونه نشست رو چک کنه (مخزن نشست موقتاً قطعه) handshake رو با
// 'unavailable' رد می‌کنه. socket.io تو رد شدنِ handshake توسط middleware
// خودکار reconnect نمی‌کنه، پس اینجا با backoff دستی دوباره وصل می‌شیم.
// بقیه‌ی خطاها ('unauthorized'، 'session-expired') قطعی‌ان و تلاش مجدد ندارن
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

function clearRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
}

// getToken رو به‌عنوان تابع می‌گیریم نه یه مقدار ثابت - چون اگه سوکت قطع و
// دوباره وصل بشه (مثلاً بعد از قطعی موقت شبکه)، باید همیشه آخرین
// accessToken معتبر رو بفرسته، نه اونی که موقع اولین اتصال گرفته بود
export function connectSocket(
  getToken: () => string | null,
  onForceLogout: () => void
): void {
  disconnectSocket();

  socket = io(SOCKET_URL, {
    auth: (cb) => cb({ token: getToken() }),
    withCredentials: true,
  });

  const current = socket;
  current.on('force-logout', () => onForceLogout());
  current.on('connect', () => clearRetry());
  current.on('connect_error', (err) => {
    if (err.message !== 'unavailable') return;
    if (retryTimer) return;
    const delay = Math.min(RETRY_BASE_MS * 2 ** retryAttempt, RETRY_MAX_MS);
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      // فقط اگه هنوز همین سوکت فعاله (وسط راه disconnect/جایگزین نشده)
      if (socket === current) current.connect();
    }, delay);
  });
}

export function disconnectSocket(): void {
  clearRetry();
  socket?.disconnect();
  socket = null;
}
