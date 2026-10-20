import { logEvent } from '../lib/logger';
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  message: string;
} {
  switch (err.code) {
    case 'P2002':
      return { status: 409, message: 'این مقدار قبلاً ثبت شده' };
    case 'P2025':
      return { status: 404, message: 'رکورد مورد نظر یافت نشد' };
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1017':
    case 'P2024':
      return {
        status: 503,
        message: 'سرویس موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.',
      };
    case 'P2028':
      return {
        status: 503,
        message: 'سرور موقتاً شلوغه، چند لحظه‌ی دیگه دوباره تلاش کن',
      };
    case 'P2003':
      return {
        status: 409,
        message: 'این عملیات با داده‌های وابسته در تعارضه',
      };
    default:
      return { status: 500, message: 'خطای پایگاه داده' };
  }
}

// Express identifies error middleware by its four-argument signature.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    return _next(err);
  }

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({
        ...err.details,
        error: /[\u0600-\u06ff]/.test(err.message)
          ? err.message
          : err.statusCode >= 500
            ? 'سرویس موقتاً در دسترس نیست؛ دوباره تلاش کنید.'
            : 'انجام درخواست ممکن نشد؛ اطلاعات واردشده را بررسی کنید.',
      });
  }

  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({
        error:
          err.issues[0]?.message &&
          /[\u0600-\u06ff]/.test(err.issues[0].message)
            ? err.issues[0].message
            : 'اطلاعات واردشده نامعتبر است.',
      });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logEvent('error', '[database error]', err);
    const { status, message } = mapPrismaError(err);
    return res.status(status).json({ error: message });
  }

  // Initialization/connectivity errors are not KnownRequestError instances.
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logEvent('error', '[database unavailable]', err);
    return res
      .status(503)
      .json({ error: 'سرویس موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.' });
  }

  // Never return runtime messages, source paths or SQL to the browser, even in development.
  logEvent('error', '[unhandled error]', err);
  res
    .status(500)
    .json({ error: 'خطای غیرمنتظره‌ای رخ داد؛ دوباره تلاش کنید.' });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'مسیر مورد نظر یافت نشد' });
}
