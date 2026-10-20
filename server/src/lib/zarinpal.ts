import { env } from '../config/env';

const BASE_URL = env.ZARINPAL_SANDBOX
  ? 'https://sandbox.zarinpal.com'
  : 'https://payment.zarinpal.com';

const STARTPAY_URL = env.ZARINPAL_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/StartPay'
  : 'https://www.zarinpal.com/pg/StartPay';

const REQUEST_TIMEOUT_MS = 15_000;

// Store amounts in toman; send the provider an explicit currency and converted amount.
const RIAL_PER_TOMAN = 10;
const toRial = (toman: number) => toman * RIAL_PER_TOMAN;

type RequestResult =
  | { ok: true; authority: string; paymentUrl: string }
  | { ok: false; message: string };

// A retryable verification failure must not mark a possibly paid transaction as failed.
type VerifyResult =
  | { ok: true; refId: number }
  | { ok: false; retryable: boolean; message: string };

// Only definitive provider errors mark a payment failed; unknown outcomes remain retryable.
const DEFINITIVE_VERIFY_FAILURE_CODES = new Set([-50, -51, -53, -54]);

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

    if (res.status >= 500) return unknownOutcome;

    const body = (await res.json()) as {
      data?: { code?: number; ref_id?: number };
      errors?: unknown;
    };

    // Provider codes 100 and 101 both mean successful verification.
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
    return unknownOutcome;
  }
}
