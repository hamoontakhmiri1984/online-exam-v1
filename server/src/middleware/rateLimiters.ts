import { otpSendKey } from '../lib/otpRateLimitKey';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../lib/redisRateLimitStore';
import { rateLimitRedis } from '../lib/rateLimitRedis';

// Successful logins do not consume the shared-IP failure budget.
export const authLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'auth'),
  passOnStoreError: false,
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'تعداد تلاش‌های شما بیش از حد مجاز بود. کمی بعد دوباره امتحان کنید.',
  },
});

// Keep the resend window aligned with the client countdown.
export const otpSendLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'otpSend'),
  passOnStoreError: false,
  windowMs: 90 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: otpSendKey,
  // Failed validation/captcha/database requests did not send a usable code.
  // Hourly IP/identifier abuse limits remain enforced by otpAbuseGuard.
  skipFailedRequests: true,
  handler: (_req, res) => {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(Number(res.getHeader('Retry-After')) || 90),
    );
    res.status(429).json({
      error: `برای درخواست دوبارهٔ کد، ${retryAfterSeconds.toLocaleString('fa-IR')} ثانیه صبر کنید.`,
      retryAfterSeconds,
    });
  },
});

export const otpVerifyLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'otpVerify'),
  passOnStoreError: false,
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.identifier ?? 'unknown'}`,
  message: { error: 'تعداد تلاش‌های اشتباه بیش از حد مجاز بود.' },
});

// Username availability checks must not consume the login failure budget.
export const usernameCheckLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'usernameCheck'),
  passOnStoreError: false,
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز بود. کمی صبر کن.' },
});

// Captcha refreshes use a separate budget from authentication attempts.
export const captchaLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'captcha'),
  passOnStoreError: false,
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز بود. کمی صبر کن.' },
});

// Count failed join attempts per user so shared classroom IPs are not penalized.
export const joinGroupLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'joinGroup'),
  passOnStoreError: false,
  windowMs: 10 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
  message: {
    error:
      'تعداد تلاش‌های ناموفق بیش از حد مجاز بود. کمی بعد دوباره امتحان کن.',
  },
});

export const checkoutLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'checkout'),
  passOnStoreError: false,
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
  message: {
    error:
      'تعداد درخواست‌های پرداخت بیش از حد مجاز بود. کمی بعد دوباره امتحان کن.',
  },
});

// Entry lookups count successful responses too, unlike password attempts.
export const authEntryLimiter = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'authEntry'),
  passOnStoreError: false,
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است؛ کمی صبر کنید.' },
});

function createExamAttemptLimiter(
  scope: string,
  windowMs: number,
  max: number,
) {
  return rateLimit({
    store: new RedisRateLimitStore(rateLimitRedis, scope),
    passOnStoreError: false,
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      `${req.user?.sub ?? 'unknown'}:${req.params.examId ?? 'unknown'}`,
    message: {
      error:
        'تعداد درخواست‌های آزمون بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
    },
  });
}

export const examAttemptStartLimiter = createExamAttemptLimiter(
  'examAttemptStart',
  10 * 60 * 1000,
  5,
);
export const examAttemptFinishLimiter = createExamAttemptLimiter(
  'examAttemptFinish',
  5 * 60 * 1000,
  10,
);
export const examAttemptAnswersLimiter = createExamAttemptLimiter(
  'examAttemptAnswers',
  60 * 1000,
  120,
);
export const examAttemptEventLimiter = createExamAttemptLimiter(
  'examAttemptEvent',
  60 * 1000,
  30,
);
