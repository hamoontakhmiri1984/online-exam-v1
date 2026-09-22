import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { env } from '../config/env';

// پیام فارسی برای رایج‌ترین کدهای خطای Prisma. کدهایی که پیش‌بینی نکردیم
// به‌صورت 500 عمومی می‌رن - نه اینکه پیام داخلی Prisma مستقیم لو بره
function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  message: string;
} {
  switch (err.code) {
    case 'P2002': // نقض unique constraint
      return { status: 409, message: 'این مقدار قبلاً ثبت شده' };
    case 'P2025': // update/delete روی رکوردی که وجود نداره
      return { status: 404, message: 'رکورد مورد نظر یافت نشد' };
    case 'P2028': // تراکنش تایم‌اوت شد (مثلاً منتظر قفلِ یه ساخت/ایمپورتِ طولانی)
      return {
        status: 503,
        message: 'سرور موقتاً شلوغه، چند لحظه‌ی دیگه دوباره تلاش کن',
      };
    case 'P2003': // نقض foreign key
      return {
        status: 409,
        message: 'این عملیات با داده‌های وابسته در تعارضه',
      };
    default:
      return { status: 500, message: 'خطای پایگاه داده' };
  }
}

// امضای چهار-پارامتری الزامیه - Express فقط با همین امضا این تابع رو
// به‌عنوان error middleware می‌شناسه، حتی اگه _next استفاده نشه
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // اگه پاسخ قبلاً شروع به ارسال شده (مثلاً streaming)، دیگه نمی‌شه
  // res.json دوباره صدا زد
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, ...err.details });
  }

  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ error: err.issues[0]?.message ?? 'ورودی نامعتبر' });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { status, message } = mapPrismaError(err);
    return res.status(status).json({ error: message });
  }

  // خطای ناشناخته/غیرمنتظره - همیشه لاگ کن، ولی جزئیاتش رو فقط تو dev
  // به کلاینت برگردون (تو production نباید پیام داخلی/stack لو بره)
  console.error('[unhandled error]', err);
  const message =
    env.NODE_ENV !== 'production' && err instanceof Error
      ? err.message
      : 'خطای غیرمنتظره‌ی سرور رخ داد';
  res.status(500).json({ error: message });
}

// برای مسیری که هیچ router‌ای match نمی‌کنه
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'مسیر مورد نظر یافت نشد' });
}
