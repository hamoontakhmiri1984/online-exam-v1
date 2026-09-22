// خطای «شناخته‌شده» و قابل‌کنترل - وقتی خودمون تشخیص می‌دیم یه وضعیت
// خطاست (نه یه bug/exception غیرمنتظره)، به‌جای res.status().json() پراکنده
// تو هر route، throw می‌کنیم و errorHandler مرکزی شکلش می‌ده.
// isOperational=true یعنی «این خطا رو می‌شناسیم و پیام‌ش امنه که مستقیم به
// کاربر نشون داده بشه» - در مقابل خطاهای برنامه‌نویسی/غیرمنتظره که پیامشون
// نباید لو بره.
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational = true;
  // فیلدهای اضافه‌ی گاه‌به‌گاه که کنار error تو پاسخ می‌رن (مثلاً reason
  // برای خطاهای محدودیت پلن) - errorHandler اینا رو کنار message می‌ذاره
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFound(message = 'یافت نشد') {
  return new AppError(404, message);
}

export function forbidden(message = 'دسترسی غیرمجاز') {
  return new AppError(403, message);
}

export function badRequest(message: string) {
  return new AppError(400, message);
}

export function conflict(message: string) {
  return new AppError(409, message);
}
