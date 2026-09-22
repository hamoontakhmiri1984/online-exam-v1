import { env } from '../config/env';

// دو ست آدرس جدا برای sandbox/production - سندباکس زرین‌پال هیچ‌وقت واقعاً
// از حساب کسی پول کم نمی‌کنه (برای تست بدون درگاه واقعی)
const BASE_URL = env.ZARINPAL_SANDBOX
  ? 'https://sandbox.zarinpal.com'
  : 'https://payment.zarinpal.com';

const STARTPAY_URL = env.ZARINPAL_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/StartPay'
  : 'https://www.zarinpal.com/pg/StartPay';

const REQUEST_TIMEOUT_MS = 15_000;

// قیمت پلن‌ها (plans.ts) و Payment.amount به «تومان» ذخیره می‌شن. زرین‌پال
// وقتی پارامتر currency نیاد واحد مبلغ رو مبهم می‌ذاره (مستندات خودش برای
// همین پارامتر currency رو گذاشته)، پس واحد رو صریح «ریال» می‌فرستیم و
// مبلغ رو ×۱۰ می‌کنیم. verify هم باید همون مبلغ ریالی رو بفرسته.
const RIAL_PER_TOMAN = 10;
const toRial = (toman: number) => toman * RIAL_PER_TOMAN;

type RequestResult =
  | { ok: true; authority: string; paymentUrl: string }
  | { ok: false; message: string };

// retryable=true یعنی «نمی‌دونیم پرداخت موفق بوده یا نه» (قطعی شبکه، تایم‌اوت،
// خطای سرور زرین‌پال، پاسخ نامفهوم) - در این حالت Payment نباید Failed بشه،
// چون ممکنه کاربر پول داده باشه. retryable=false یعنی زرین‌پال صریحاً گفته
// این تراکنش پرداخت‌شده/معتبر نیست.
type VerifyResult =
  | { ok: true; refId: number }
  | { ok: false; retryable: boolean; message: string };

// کدهای خطای verify که قطعاً یعنی «این تراکنش موفق نیست»
// (-50 مبلغ نامطابق، -51 پرداخت ناموفق، -53 متعلق به این مرچنت نیست،
// -54 authority نامعتبر). هر خطای دیگه‌ای (مثلاً -52 خطای پیش‌بینی‌نشده)
// می‌تونه موقتی باشه و retryable حساب می‌شه.
const DEFINITIVE_VERIFY_FAILURE_CODES = new Set([-50, -51, -53, -54]);

// مرحله‌ی ۱ - گرفتن authority از زرین‌پال قبل از ریدایرکت کاربر. amount به
// «تومان» گرفته می‌شه و همین‌جا به ریال تبدیل می‌شه.
export async function requestPayment(params: {
  amount: number;
  description: string;
  callbackUrl: string;
}): Promise<RequestResult> {
  try {
    const res = await fetch(`${BASE_URL}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: env.ZARINPAL_MERCHANT_ID,
        currency: 'IRR',
        amount: toRial(params.amount),
        description: params.description,
        callback_url: params.callbackUrl,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = (await res.json()) as {
      data?: { authority?: string; code?: number };
      errors?: unknown;
    };

    const authority = data.data?.authority;
    if (!authority || data.data?.code !== 100) {
      return { ok: false, message: 'درخواست پرداخت از زرین‌پال رد شد' };
    }

    return {
      ok: true,
      authority,
      paymentUrl: `${STARTPAY_URL}/${authority}`,
    };
  } catch {
    return { ok: false, message: 'اتصال به درگاه پرداخت برقرار نشد' };
  }
}

// مرحله‌ی ۲ - بعد از برگشت کاربر از درگاه، سمت سرور (نه کلاینت) تایید
// می‌کنیم که پرداخت واقعاً موفق بوده. amount (تومان) از ردیف Payment تو
// دیتابیس میاد، نه از چیزی که کلاینت/query-string می‌گه.
export async function verifyPayment(params: {
  amount: number;
  authority: string;
}): Promise<VerifyResult> {
  const unknownOutcome: VerifyResult = {
    ok: false,
    retryable: true,
    message: 'نتیجه‌ی تراکنش هنوز مشخص نشده',
  };

  try {
    const res = await fetch(`${BASE_URL}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: env.ZARINPAL_MERCHANT_ID,
        amount: toRial(params.amount),
        authority: params.authority,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // خطای سمت سرور زرین‌پال (5xx) یعنی نتیجه نامشخصه، نه اینکه پرداخت رد شده
    if (res.status >= 500) return unknownOutcome;

    const body = (await res.json()) as {
      data?: { code?: number; ref_id?: number };
      // موقع موفقیت آرایه‌ی خالیه، موقع خطا آبجکت { code, message }
      errors?: unknown;
    };

    // کد ۱۰۰ یعنی تایید شد، ۱۰۱ یعنی قبلاً هم تایید شده بود (idempotent) -
    // هر دو رو موفق حساب می‌کنیم
    const code = body.data?.code;
    if (code === 100 || code === 101) {
      return { ok: true, refId: body.data?.ref_id ?? 0 };
    }

    const errors = body.errors;
    const errorCode =
      errors && !Array.isArray(errors)
        ? (errors as { code?: unknown }).code
        : undefined;

    if (
      typeof errorCode === 'number' &&
      DEFINITIVE_VERIFY_FAILURE_CODES.has(errorCode)
    ) {
      return { ok: false, retryable: false, message: 'تراکنش تایید نشد' };
    }

    return unknownOutcome;
  } catch {
    // قطعی شبکه، تایم‌اوت یا پاسخ غیرJSON
    return unknownOutcome;
  }
}
